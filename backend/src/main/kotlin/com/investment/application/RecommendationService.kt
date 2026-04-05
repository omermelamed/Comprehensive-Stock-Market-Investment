package com.investment.application

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.investment.api.dto.PortfolioContextSummary
import com.investment.api.dto.RecommendationCard
import com.investment.api.dto.RecommendationsResponse
import com.investment.domain.MarketDataUnavailableException
import com.investment.infrastructure.AllocationRepository
import com.investment.infrastructure.HoldingsProjectionRepository
import com.investment.infrastructure.RecommendationCacheRepository
import com.investment.infrastructure.WatchlistRepository
import com.investment.infrastructure.ai.ClaudeClient
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Instant
import java.time.temporal.ChronoUnit

@Service
class RecommendationService(
    private val recommendationCacheRepository: RecommendationCacheRepository,
    private val userProfileService: UserProfileService,
    private val holdingsRepository: HoldingsProjectionRepository,
    private val allocationRepository: AllocationRepository,
    private val watchlistRepository: WatchlistRepository,
    private val marketDataService: MarketDataService,
    private val claudeClient: ClaudeClient,
    private val objectMapper: ObjectMapper
) {

    private val log = LoggerFactory.getLogger(javaClass)

    private companion object {
        private const val DEFAULT_CURRENCY = "USD"
        private const val DEFAULT_RISK_LEVEL = "MODERATE"
        private val HUNDRED = BigDecimal("100")
        private val SCALE = 2
        private val ROUNDING = RoundingMode.HALF_UP
        private val ACTIONABLE_SIGNALS = setOf("GOOD_BUY_NOW", "WAIT_FOR_DIP")
    }

    fun getRecommendations(): RecommendationsResponse {
        val cached = recommendationCacheRepository.findFresh()
        if (cached != null) {
            return buildResponse(
                recommendations = cached.recommendations,
                generatedAt = cached.generatedAt,
                expiresAt = cached.expiresAt
            )
        }
        return generateAndCache()
    }

    fun forceRefresh(): RecommendationsResponse {
        return generateAndCache()
    }

    private fun generateAndCache(): RecommendationsResponse {
        val profile = userProfileService.getProfile()
        val currency = profile?.preferredCurrency ?: DEFAULT_CURRENCY
        val riskLevel = profile?.riskLevel ?: DEFAULT_RISK_LEVEL
        val monthlyBudget = profile?.monthlyInvestmentMax ?: BigDecimal.ZERO
        val tracksEnabled = profile?.tracksEnabled ?: emptyList()

        val holdings = holdingsRepository.findAll()
        val allocations = allocationRepository.findAll()
        val prices = holdings.associate { holding ->
            val upperSymbol = holding.symbol.uppercase()
            val convertedPrice = try {
                val quote = marketDataService.getQuote(holding.symbol)
                val rate = marketDataService.getExchangeRate(quote.currency, currency)
                quote.price * rate
            } catch (e: MarketDataUnavailableException) {
                log.warn("Market data unavailable for {}", holding.symbol)
                BigDecimal.ZERO
            } catch (e: Exception) {
                log.warn("Price conversion failed for {}: {}", holding.symbol, e.message)
                BigDecimal.ZERO
            }
            upperSymbol to convertedPrice
        }

        val totalPortfolioValue = holdings.sumOf { h ->
            (prices[h.symbol.uppercase()] ?: BigDecimal.ZERO) * h.netQuantity
        }.setScale(SCALE, ROUNDING)

        // Compute gap for each allocation target with a holding or zero current value
        data class GapEntry(val symbol: String, val gapPercent: BigDecimal, val gapValue: BigDecimal)

        val gaps = allocations.mapNotNull { alloc ->
            val upperSymbol = alloc.symbol.uppercase()
            val holding = holdings.firstOrNull { it.symbol.uppercase() == upperSymbol }
            val currentValue = if (holding != null) {
                (prices[upperSymbol] ?: BigDecimal.ZERO) * holding.netQuantity
            } else {
                BigDecimal.ZERO
            }
            val currentPercent = if (totalPortfolioValue.compareTo(BigDecimal.ZERO) != 0) {
                (currentValue.divide(totalPortfolioValue, 10, ROUNDING) * HUNDRED).setScale(SCALE, ROUNDING)
            } else {
                BigDecimal.ZERO
            }
            val gapPercent = (alloc.targetPercentage - currentPercent).setScale(SCALE, ROUNDING)
            // Only include underweight positions (positive gap)
            if (gapPercent > BigDecimal.ZERO) {
                val gapValue = (totalPortfolioValue * gapPercent.divide(HUNDRED, 10, ROUNDING)).setScale(SCALE, ROUNDING)
                GapEntry(symbol = upperSymbol, gapPercent = gapPercent, gapValue = gapValue)
            } else {
                null
            }
        }.sortedByDescending { it.gapPercent }.take(5)

        val watchlistItems = watchlistRepository.findAll()
            .filter { it.signal in ACTIONABLE_SIGNALS }

        val userMessage = buildUserMessage(
            totalPortfolioValue = totalPortfolioValue,
            currency = currency,
            monthlyBudget = monthlyBudget,
            riskLevel = riskLevel,
            tracksEnabled = tracksEnabled,
            gaps = gaps.map { Triple(it.symbol, it.gapPercent, it.gapValue) },
            watchlistItems = watchlistItems.map { it.symbol to it.signal }
        )

        val rawResponse = try {
            claudeClient.complete(SYSTEM_PROMPT, userMessage, maxTokens = 1000)
        } catch (e: Exception) {
            log.warn("Claude recommendation request failed: {}", e.message)
            ""
        }

        val recommendations = parseRecommendations(rawResponse)

        val now = Instant.now()
        val expiresAt = now.plus(15, ChronoUnit.MINUTES)
        recommendationCacheRepository.save(recommendations, generatedAt = now, expiresAt = expiresAt)

        return buildResponse(
            recommendations = recommendations,
            generatedAt = now,
            expiresAt = expiresAt,
            totalValue = totalPortfolioValue,
            currency = currency,
            monthlyBudget = monthlyBudget,
            riskLevel = riskLevel,
            tracksEnabled = tracksEnabled
        )
    }

    private fun buildResponse(
        recommendations: List<RecommendationCard>,
        generatedAt: Instant,
        expiresAt: Instant,
        totalValue: BigDecimal = BigDecimal.ZERO,
        currency: String = DEFAULT_CURRENCY,
        monthlyBudget: BigDecimal = BigDecimal.ZERO,
        riskLevel: String = DEFAULT_RISK_LEVEL,
        tracksEnabled: List<String> = emptyList()
    ): RecommendationsResponse {
        // When serving from cache, attempt to re-load live profile context for display accuracy
        val profile = userProfileService.getProfile()
        val effectiveCurrency = profile?.preferredCurrency ?: currency
        val effectiveBudget = profile?.monthlyInvestmentMax ?: monthlyBudget
        val effectiveRisk = profile?.riskLevel ?: riskLevel
        val effectiveTracks = profile?.tracksEnabled ?: tracksEnabled

        // Portfolio total is not re-computed when serving from cache; pass zero and let caller decide
        return RecommendationsResponse(
            recommendations = recommendations,
            generatedAt = generatedAt,
            expiresAt = expiresAt,
            portfolioContext = PortfolioContextSummary(
                totalValue = totalValue,
                currency = effectiveCurrency,
                monthlyBudget = effectiveBudget,
                riskLevel = effectiveRisk,
                tracksEnabled = effectiveTracks
            )
        )
    }

    private fun buildUserMessage(
        totalPortfolioValue: BigDecimal,
        currency: String,
        monthlyBudget: BigDecimal,
        riskLevel: String,
        tracksEnabled: List<String>,
        gaps: List<Triple<String, BigDecimal, BigDecimal>>,
        watchlistItems: List<Pair<String, String>>
    ): String = buildString {
        appendLine("Portfolio total: $totalPortfolioValue $currency")
        appendLine("Monthly budget: $monthlyBudget $currency")
        appendLine("Risk profile: $riskLevel")
        appendLine("Tracks enabled: ${tracksEnabled.joinToString(", ").ifEmpty { "LONG" }}")
        appendLine()
        appendLine("Underweight positions (top 5 by gap, descending):")
        if (gaps.isEmpty()) {
            appendLine("  None — portfolio is at or above target for all positions.")
        } else {
            gaps.forEach { (symbol, gapPct, gapValue) ->
                appendLine("  $symbol: gap ${gapPct}% (${gapValue} $currency below target)")
            }
        }
        appendLine()
        appendLine("Watchlist items with actionable signals:")
        if (watchlistItems.isEmpty()) {
            appendLine("  None.")
        } else {
            watchlistItems.forEach { (symbol, signal) ->
                appendLine("  $symbol: $signal")
            }
        }
        appendLine()
        append("Generate a prioritized list of investment recommendations based on this context.")
    }

    private fun parseRecommendations(raw: String): List<RecommendationCard> {
        if (raw.isBlank()) return emptyList()
        return try {
            objectMapper.readValue<List<RecommendationCard>>(raw)
        } catch (e: Exception) {
            log.warn("Failed to parse recommendation response from Claude: {}", e.message)
            emptyList()
        }
    }

    private val SYSTEM_PROMPT = """
        You are a disciplined investment advisor for a personal portfolio app.
        Return ONLY valid JSON — no markdown, no explanation outside the JSON:
        [
          {
            "rank": 1,
            "symbol": "VOO",
            "action": "BUY",
            "source": "ALLOCATION_GAP",
            "reason": "<2-3 sentences explaining why>",
            "suggestedAmount": 1500.00,
            "confidence": "HIGH"
          }
        ]

        Rules:
        - rank from 1 (highest priority) to N
        - source must be one of: ALLOCATION_GAP, WATCHLIST, AI_SUGGESTION
        - action is always BUY
        - suggestedAmount is optional (null if you cannot estimate)
        - confidence: HIGH if strong allocation gap or GOOD_BUY_NOW signal; MEDIUM for moderate; LOW for speculative
        - limit to 8 recommendations maximum
        - never suggest selling
        - never invent data not provided
    """.trimIndent()
}
