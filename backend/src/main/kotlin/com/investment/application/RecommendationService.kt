package com.investment.application

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.investment.api.dto.PortfolioContextSummary
import com.investment.api.dto.RecommendationCard
import com.investment.api.dto.RecommendationsResponse
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
    private val objectMapper: ObjectMapper
) {

    private val log = LoggerFactory.getLogger(javaClass)

    private companion object {
        private const val DEFAULT_CURRENCY = "USD"
        private const val DEFAULT_RISK_LEVEL = "MODERATE"
        private val ACTIONABLE_SIGNALS = setOf("GOOD_BUY_NOW", "WAIT_FOR_DIP")
    }

    fun getRecommendations(): RecommendationsResponse {
        val cached = recommendationCacheRepository.findFresh()
        if (cached != null) {
            // Re-load live profile and portfolio total even on cache hits so the context strip is accurate
            val profile = userProfileService.getProfile()
            val currency = profile?.preferredCurrency ?: DEFAULT_CURRENCY
            val liveTotal = computePortfolioTotal(currency)
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
        val profile = userProfileService.getProfile()
        val currency = profile?.preferredCurrency ?: DEFAULT_CURRENCY
        val riskLevel = profile?.riskLevel ?: DEFAULT_RISK_LEVEL
        val monthlyBudget = profile?.monthlyInvestmentMax ?: BigDecimal.ZERO
        val tracksEnabled = profile?.tracksEnabled ?: emptyList()

        val holdings = holdingsRepository.findAll()
        val prices = loadPrices(holdings.map { it.symbol }, currency)

        val totalPortfolioValue = RecommendationGapCalculator.computePortfolioTotal(holdings, prices)
        val gaps = RecommendationGapCalculator.computeUnderweightGaps(
            holdings = holdings,
            allocations = allocationRepository.findAll(),
            prices = prices,
            totalPortfolioValue = totalPortfolioValue,
            limit = 5
        )

        val watchlistItems = watchlistRepository.findAll().filter { it.signal in ACTIONABLE_SIGNALS }

        val userMessage = buildUserMessage(
            totalPortfolioValue = totalPortfolioValue,
            currency = currency,
            monthlyBudget = monthlyBudget,
            riskLevel = riskLevel,
            tracksEnabled = tracksEnabled,
            gaps = gaps,
            watchlistItems = watchlistItems.map { it.symbol to it.signal }
        )

        // Attempt Claude generation — distinguish Claude failure from parse failure
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
                    // Enrich each card with deterministic data: price, fundamentals, source URL
                    parsed.map { card ->
                        val upper = card.symbol.uppercase()
                        card.copy(
                            currentPrice = prices[upper],
                            fundamentals = alphaVantageAdapter.fetchFundamentals(upper),
                            sourceUrl = "https://finance.yahoo.com/quote/$upper"
                        )
                    }
                }
            }
        }

        val now = Instant.now()
        val expiresAt = now.plus(15, ChronoUnit.MINUTES)

        // Only persist successful non-empty results; failed generation should not poison the cache
        if (recommendations.isNotEmpty()) {
            recommendationCacheRepository.save(recommendations, generatedAt = now, expiresAt = expiresAt)
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

    /**
     * Loads converted prices for a list of symbols into the user's preferred currency.
     * Returns zero for any symbol where market data is unavailable — this is logged as a warning.
     */
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

    /**
     * Computes live portfolio total for cache-hit responses.
     * Fetches prices fresh — acceptable for a local personal app.
     */
    private fun computePortfolioTotal(currency: String): BigDecimal {
        val holdings = holdingsRepository.findAll()
        val prices = loadPrices(holdings.map { it.symbol }, currency)
        return RecommendationGapCalculator.computePortfolioTotal(holdings, prices)
    }

    private fun buildUserMessage(
        totalPortfolioValue: BigDecimal,
        currency: String,
        monthlyBudget: BigDecimal,
        riskLevel: String,
        tracksEnabled: List<String>,
        gaps: List<RecommendationGapCalculator.GapEntry>,
        watchlistItems: List<Pair<String, String>>
    ): String = buildString {
        appendLine("Portfolio total: $totalPortfolioValue $currency")
        appendLine("Monthly budget: $monthlyBudget $currency")
        appendLine("Risk profile: $riskLevel")
        appendLine("Tracks enabled: ${tracksEnabled.joinToString(", ").ifEmpty { "LONG" }}")
        appendLine()
        appendLine("Underweight positions (top 5 by allocation gap, descending):")
        if (gaps.isEmpty()) {
            appendLine("  None — portfolio is at or above target for all positions.")
        } else {
            gaps.forEach { g ->
                appendLine("  ${g.symbol}: gap ${g.gapPercent}% (${g.gapValue} $currency below target), current price ${g.currentPrice} $currency")
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

        // Track-specific orchestration sections
        val upperTracks = tracksEnabled.map { it.uppercase() }

        if ("SHORT" in upperTracks) {
            appendLine()
            appendLine("SHORT TRACK ACTIVE: In addition to BUY recommendations, identify any significantly overweight or overvalued positions in the portfolio that could be short candidates. You may include SHORT recommendations (action='SHORT') when the case is compelling. Be conservative — only clear overvaluation or deteriorating fundamentals warrant a short.")
        }

        if ("CRYPTO" in upperTracks) {
            appendLine()
            appendLine("CRYPTO TRACK ACTIVE: Treat any digital-asset or cryptocurrency watchlist items with crypto-appropriate context (market structure, trend, on-chain sentiment if known). Prioritize crypto watchlist items with GOOD_BUY_NOW signals.")
        }

        if ("OPTIONS" in upperTracks) {
            appendLine()
            appendLine("OPTIONS TRACK ACTIVE: For top long equity positions with significant holdings, consider whether a covered call overlay is appropriate for income generation. You may add COVERED_CALL recommendations (action='COVERED_CALL') alongside BUY recommendations. Do not suggest naked options or speculative strategies.")
        }

        appendLine()
        append("Generate a prioritized list of investment recommendations based on the above context.")
    }

    /**
     * Parses Claude's JSON response. Returns null on parse failure, empty list if Claude returns [].
     */
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
          "timeHorizon": "6-12 months",
          "catalysts": ["key reason 1", "key reason 2"]
        }

        Rules:
        - rank from 1 (highest priority) to N
        - action: "BUY" for underweight or watchlist buys; "SHORT" only when SHORT track is active and overvaluation is clear; "COVERED_CALL" only when OPTIONS track is active on an existing long
        - source: "ALLOCATION_GAP" | "WATCHLIST" | "AI_SUGGESTION"
        - suggestedAmount is optional — null if you cannot estimate; must not exceed the stated monthly budget
        - confidence: HIGH for strong allocation gap or GOOD_BUY_NOW; MEDIUM for moderate signals; LOW for speculative
        - timeHorizon is optional — typical holding period suggestion, e.g. "3-6 months", "1-2 years"
        - catalysts is optional — 2-3 concise bullet-point reasons; omit if you have none beyond the gap
        - limit to 8 recommendations maximum
        - never suggest selling existing long positions
        - never invent prices, metrics, or data not provided in the user context
    """.trimIndent()
}
