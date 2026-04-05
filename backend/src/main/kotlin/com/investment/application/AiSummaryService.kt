package com.investment.application

import com.investment.api.dto.MonthlyFlowSummariesRequest
import com.investment.api.dto.PositionSummaryResponse
import com.investment.domain.MonthlyAllocationCalculator
import com.investment.infrastructure.AllocationRepository
import com.investment.infrastructure.HoldingsProjectionRepository
import com.investment.infrastructure.ai.ClaudeClient
import org.springframework.stereotype.Service
import java.math.BigDecimal

@Service
class AiSummaryService(
    private val holdingsRepository: HoldingsProjectionRepository,
    private val allocationRepository: AllocationRepository,
    private val marketDataService: MarketDataService,
    private val userProfileService: UserProfileService,
    private val claudeClient: ClaudeClient
) {

    fun generateSummaries(request: MonthlyFlowSummariesRequest): List<PositionSummaryResponse> {
        val holdings = holdingsRepository.findAll()
        val allocations = allocationRepository.findAll()
        val symbols = (holdings.map { it.symbol } + allocations.map { it.symbol })
            .map { it.uppercase() }.distinct()

        val prices = symbols.mapNotNull { symbol ->
            try { symbol to marketDataService.getQuote(symbol).price } catch (e: Exception) { null }
        }.toMap()

        val preview = MonthlyAllocationCalculator.compute(holdings, allocations, prices, request.budget)

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

        return preview.positions.map { position ->
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
            }

            val summary = try {
                claudeClient.complete(system, userMessage)
            } catch (e: Exception) {
                ""
            }

            PositionSummaryResponse(symbol = position.symbol, summary = summary)
        }
    }
}
