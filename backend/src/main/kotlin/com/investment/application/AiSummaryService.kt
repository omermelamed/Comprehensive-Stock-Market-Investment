package com.investment.application

import com.investment.api.dto.MonthlyFlowSummariesRequest
import com.investment.api.dto.PositionSummaryResponse
import com.investment.domain.MonthlyAllocationCalculator
import com.investment.infrastructure.AllocationRepository
import com.investment.infrastructure.HoldingsProjectionRepository
import com.investment.infrastructure.ai.ClaudeClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.runBlocking
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.security.MessageDigest
import java.time.Clock
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

@Service
class AiSummaryService(
    private val holdingsRepository: HoldingsProjectionRepository,
    private val allocationRepository: AllocationRepository,
    private val marketDataService: MarketDataService,
    private val userProfileService: UserProfileService,
    private val claudeClient: ClaudeClient,
    private val clock: Clock
) {

    private data class CachedSummaries(
        val summaries: List<PositionSummaryResponse>,
        val cachedAt: Instant
    )

    private val cache = ConcurrentHashMap<String, CachedSummaries>()

    companion object {
        private const val CACHE_TTL_MINUTES = 15L
    }

    fun generateSummaries(request: MonthlyFlowSummariesRequest): List<PositionSummaryResponse> {
        val holdings = holdingsRepository.findAll()
        val allocations = allocationRepository.findAll()
        val symbols = (holdings.map { it.symbol } + allocations.map { it.symbol })
            .map { it.uppercase() }.distinct()

        val prices = symbols.mapNotNull { symbol ->
            try { symbol to marketDataService.getQuote(symbol).price } catch (e: Exception) { null }
        }.toMap()

        val preview = MonthlyAllocationCalculator.compute(holdings, allocations, prices, request.budget)

        val cacheKey = computeCacheKey(request.budget, preview.positions.map { "${it.symbol}:${it.currentPercent}:${it.targetPercent}" })
        val now = clock.instant()
        val cached = cache[cacheKey]
        if (cached != null && now.isBefore(cached.cachedAt.plusSeconds(CACHE_TTL_MINUTES * 60))) {
            return cached.summaries
        }

        val profile = userProfileService.getProfile()
        val riskLevel = profile?.riskLevel ?: "MODERATE"
        val portfolioTotal = preview.portfolioTotal

        val system = """
            You are a calm, data-driven investment assistant for a personal portfolio app.
            Write exactly 1-2 sentences of commentary per position.
            Reference specific numbers. Be factual and concise.
            Never suggest selling. Never invent data not given to you.
            Do not use promotional language or excessive hedging.
        """.trimIndent()

        val summaries = runBlocking {
            preview.positions.map { position ->
                async(Dispatchers.IO) {
                    val userMessage = buildString {
                        appendLine("Portfolio context:")
                        appendLine("- Total portfolio value: $${portfolioTotal.setScale(2)}")
                        appendLine("- Monthly budget: $${request.budget.setScale(2)}")
                        appendLine("- Investor risk profile: $riskLevel")
                        appendLine()
                        appendLine("Position: ${position.symbol}${if (!position.label.isNullOrBlank()) " (${position.label})" else ""}")
                        appendLine("- Status: ${position.status}")
                        appendLine("- Current allocation: ${position.currentPercent.setScale(2)}% ($${position.currentValue.setScale(2)})")
                        appendLine("- Target allocation: ${position.targetPercent.setScale(2)}%")
                        appendLine("- Gap: ${position.gapPercent.setScale(2)}% ($${position.gapValue.setScale(2)})")
                        if (position.suggestedAmount.compareTo(BigDecimal.ZERO) > 0) {
                            appendLine("- Suggested investment this month: $${position.suggestedAmount.setScale(2)}")
                        } else {
                            appendLine("- Suggested investment this month: $0 (position is ${position.status.lowercase()})")
                        }
                        appendLine()
                        append("Provide 1-2 sentences of commentary on this allocation decision.")
                        append(" End your response with exactly one of these sentiment tags on its own line: [POSITIVE] [NEUTRAL] [CAUTIOUS]")
                    }

                    val rawResponse = try {
                        claudeClient.complete(system, userMessage)
                    } catch (e: Exception) {
                        ""
                    }

                    val (summary, sentiment) = parseSentiment(rawResponse)
                    PositionSummaryResponse(symbol = position.symbol, summary = summary, sentiment = sentiment)
                }
            }.map { it.await() }
        }

        cache[cacheKey] = CachedSummaries(summaries = summaries, cachedAt = now)
        return summaries
    }

    private fun parseSentiment(raw: String): Pair<String, String> {
        val sentimentPattern = Regex("""\[(POSITIVE|NEUTRAL|CAUTIOUS)]""")
        val match = sentimentPattern.findAll(raw).lastOrNull()
        val sentiment = match?.groupValues?.get(1) ?: "NEUTRAL"
        val summary = raw.replace(sentimentPattern, "").trim()
        return summary to sentiment
    }

    private fun computeCacheKey(budget: BigDecimal, positionFingerprints: List<String>): String {
        val raw = "$budget|${positionFingerprints.sorted().joinToString(",")}"
        val digest = MessageDigest.getInstance("SHA-256").digest(raw.toByteArray())
        return digest.joinToString("") { "%02x".format(it) }.take(16)
    }
}
