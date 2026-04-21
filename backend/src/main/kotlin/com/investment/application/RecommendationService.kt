package com.investment.application

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.investment.api.dto.PortfolioContextSummary
import com.investment.api.dto.RecommendationCard
import com.investment.api.dto.RecommendationsResponse
import com.investment.application.agents.AgentContext
import com.investment.application.agents.OrchestratorAgentService
import com.investment.domain.MarketDataUnavailableException
import com.investment.domain.RecommendationGapCalculator
import com.investment.infrastructure.AllocationRepository
import com.investment.infrastructure.HoldingsProjectionRepository
import com.investment.infrastructure.RecommendationCacheRepository
import com.investment.infrastructure.WatchlistRepository
import com.investment.infrastructure.ai.ClaudeClient
import com.investment.infrastructure.market.AlphaVantageAdapter
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
    private val alphaVantageAdapter: AlphaVantageAdapter,
    private val claudeClient: ClaudeClient,
    private val objectMapper: ObjectMapper,
    private val orchestratorAgentService: OrchestratorAgentService,
) {

    private val log = LoggerFactory.getLogger(javaClass)

    private companion object {
        private const val DEFAULT_CURRENCY = "USD"
        private const val DEFAULT_RISK_LEVEL = "MODERATE"
        private val ACTIONABLE_SIGNALS = setOf("GOOD_BUY_NOW", "WAIT_FOR_DIP")
    }

    fun getRecommendations(): RecommendationsResponse {
        val userId = RequestContext.get()
        val cached = recommendationCacheRepository.findFresh(userId)
        if (cached != null) {
            val profile = userProfileService.getProfile()
            val currency = profile?.preferredCurrency ?: DEFAULT_CURRENCY
            val liveTotal = computePortfolioTotal(userId, currency)
            return RecommendationsResponse(
                recommendations = cached.recommendations,
                generatedAt = cached.generatedAt,
                expiresAt = cached.expiresAt,
                portfolioContext = PortfolioContextSummary(
                    totalValue = liveTotal,
                    currency = currency,
                    monthlyBudget = profile?.monthlyInvestmentMax ?: BigDecimal.ZERO,
                    riskLevel = profile?.riskLevel ?: DEFAULT_RISK_LEVEL,
                    tracksEnabled = profile?.tracksEnabled ?: emptyList()
                )
            )
        }
        return generateAndCache()
    }

    fun forceRefresh(): RecommendationsResponse {
        return generateAndCache()
    }

    private fun generateAndCache(): RecommendationsResponse {
        val userId = RequestContext.get()
        val profile = userProfileService.getProfile()
        val currency = profile?.preferredCurrency ?: DEFAULT_CURRENCY
        val riskLevel = profile?.riskLevel ?: DEFAULT_RISK_LEVEL
        val monthlyBudget = profile?.monthlyInvestmentMax ?: BigDecimal.ZERO
        val tracksEnabled = profile?.tracksEnabled ?: emptyList()

        val holdings = holdingsRepository.findAll(userId)
        val prices = loadPrices(holdings.map { it.symbol }, currency)

        val totalPortfolioValue = RecommendationGapCalculator.computePortfolioTotal(holdings, prices)
        val gaps = RecommendationGapCalculator.computeUnderweightGaps(
            holdings = holdings,
            allocations = allocationRepository.findAll(userId),
            prices = prices,
            totalPortfolioValue = totalPortfolioValue,
            limit = 5
        )

        val watchlistItems = watchlistRepository.findAll(userId).filter { it.signal in ACTIONABLE_SIGNALS }

        val agentContext = AgentContext(
            totalPortfolioValue = totalPortfolioValue,
            currency = currency,
            monthlyBudget = monthlyBudget,
            riskLevel = riskLevel,
            tracksEnabled = tracksEnabled,
            gaps = gaps,
            watchlistItems = watchlistItems.map { it.symbol to it.signal },
        )
        val userMessage = orchestratorAgentService.buildCombinedPrompt(agentContext)

        var generationError: String? = null
        val rawResponse = try {
            claudeClient.complete(SYSTEM_PROMPT, userMessage, maxTokens = 1400)
        } catch (e: Exception) {
            log.warn("Claude recommendation API call failed: {}", e.message)
            generationError = "claude_failure"
            ""
        }

        val recommendations: List<RecommendationCard> = when {
            generationError != null -> emptyList()
            rawResponse.isBlank() -> {
                generationError = "claude_failure"
                emptyList()
            }
            else -> {
                val parsed = tryParseRecommendations(rawResponse)
                if (parsed == null) {
                    log.warn("Failed to parse Claude recommendation JSON")
                    generationError = "parse_failure"
                    emptyList()
                } else {
                    val confidenceOrder = mapOf("HIGH" to 0, "MEDIUM" to 1, "LOW" to 2)
                    val enriched = parsed.map { card ->
                        val upper = card.symbol.uppercase()
                        val enrichedTargetPrice = card.targetPrice
                        val enrichedCurrentPrice = prices[upper]
                        val expectedReturn =
                            if (
                                enrichedTargetPrice != null &&
                                enrichedCurrentPrice != null &&
                                enrichedCurrentPrice > BigDecimal.ZERO
                            ) {
                                ((enrichedTargetPrice - enrichedCurrentPrice) / enrichedCurrentPrice * BigDecimal.valueOf(100))
                                    .setScale(1, RoundingMode.HALF_UP)
                            } else {
                                null
                            }
                        card.copy(
                            currentPrice = enrichedCurrentPrice,
                            expectedReturnPercent = expectedReturn,
                            fundamentals = alphaVantageAdapter.fetchFundamentals(upper),
                            sourceUrl = "https://finance.yahoo.com/quote/$upper",
                        )
                    }
                    enriched
                        .sortedWith(
                            compareBy<RecommendationCard> { confidenceOrder[it.confidence] ?: 3 }
                                .thenBy { it.rank },
                        )
                        .mapIndexed { i, card -> card.copy(rank = i + 1) }
                }
            }
        }

        val now = Instant.now()
        val expiresAt = now.plus(15, ChronoUnit.MINUTES)

        if (recommendations.isNotEmpty()) {
            recommendationCacheRepository.save(userId, recommendations, generatedAt = now, expiresAt = expiresAt)
        }

        return RecommendationsResponse(
            recommendations = recommendations,
            generatedAt = now,
            expiresAt = expiresAt,
            generationError = generationError,
            portfolioContext = PortfolioContextSummary(
                totalValue = totalPortfolioValue,
                currency = currency,
                monthlyBudget = monthlyBudget,
                riskLevel = riskLevel,
                tracksEnabled = tracksEnabled
            )
        )
    }

    private fun loadPrices(symbols: List<String>, currency: String): Map<String, BigDecimal> {
        return symbols.associate { symbol ->
            val upperSymbol = symbol.uppercase()
            val price = try {
                val quote = marketDataService.getQuote(symbol)
                val rate = marketDataService.getExchangeRate(quote.currency, currency)
                quote.price * rate
            } catch (e: MarketDataUnavailableException) {
                log.warn("Market data unavailable for {}", symbol)
                BigDecimal.ZERO
            } catch (e: Exception) {
                log.warn("Price conversion failed for {}: {}", symbol, e.message)
                BigDecimal.ZERO
            }
            upperSymbol to price
        }
    }

    private fun computePortfolioTotal(userId: java.util.UUID, currency: String): BigDecimal {
        val holdings = holdingsRepository.findAll(userId)
        val prices = loadPrices(holdings.map { it.symbol }, currency)
        return RecommendationGapCalculator.computePortfolioTotal(holdings, prices)
    }

    private fun tryParseRecommendations(raw: String): List<RecommendationCard>? {
        val cleaned = raw.trim()
            .removePrefix("```json")
            .removePrefix("```")
            .removeSuffix("```")
            .trim()
        return try {
            objectMapper.readValue<List<RecommendationCard>>(cleaned)
        } catch (e: Exception) {
            log.debug("Raw Claude response was: {}", raw)
            null
        }
    }

    private val SYSTEM_PROMPT = """
        You are a disciplined investment advisor for a personal portfolio app.
        Return ONLY valid JSON — a JSON array with no markdown, no explanation outside the array.

        Each element schema:
        {
          "rank": 1,
          "symbol": "VOO",
          "action": "BUY",
          "source": "ALLOCATION_GAP",
          "reason": "<2-3 sentences explaining why>",
          "suggestedAmount": 1500.00,
          "confidence": "HIGH",
          "targetPrice": 250.00,
          "timeHorizon": "6-12 months",
          "catalysts": ["key reason 1", "key reason 2"]
        }

        Rules:
        - rank from 1 (highest priority) to N
        - action: "BUY" for underweight or watchlist buys; "SHORT" only when SHORT track is active and overvaluation is clear; "COVERED_CALL" only when OPTIONS track is active on an existing long
        - source: "ALLOCATION_GAP" | "WATCHLIST" | "AI_SUGGESTION"
        - suggestedAmount is optional — null if you cannot estimate; must not exceed the stated monthly budget
        - confidence: HIGH for strong allocation gap or GOOD_BUY_NOW; MEDIUM for moderate signals; LOW for speculative
        - targetPrice is optional — your 12-month price target; omit if you cannot justify one
        - timeHorizon is optional — typical holding period suggestion, e.g. "3-6 months", "1-2 years"
        - catalysts is optional — 2-3 concise bullet-point reasons; omit if you have none beyond the gap
        - limit to 8 recommendations maximum
        - never suggest selling existing long positions
        - never invent prices, metrics, or data not provided in the user context
    """.trimIndent()
}
