package com.investment.application.agents

import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component

@Component
@Order(1)
class LongEquityAgentService : RecommendationSubAgent {
    override fun isActive(tracksEnabled: List<String>) = true

    override fun buildPromptSection(context: AgentContext): String = buildString {
        appendLine("Portfolio total: ${context.totalPortfolioValue} ${context.currency}")
        appendLine("Monthly budget: ${context.monthlyBudget} ${context.currency}")
        appendLine("Risk profile: ${context.riskLevel}")
        appendLine("Tracks enabled: ${context.tracksEnabled.joinToString(", ").ifEmpty { "LONG" }}")
        appendLine()
        appendLine("Underweight positions (top 5 by allocation gap, descending):")
        if (context.gaps.isEmpty()) {
            appendLine("  None — portfolio is at or above target for all positions.")
        } else {
            context.gaps.forEach { g ->
                appendLine(
                    "  ${g.symbol}: gap ${g.gapPercent}% (${g.gapValue} ${context.currency} below target), current price ${g.currentPrice} ${context.currency}",
                )
            }
        }
        appendLine()
        appendLine("Watchlist items with actionable signals:")
        if (context.watchlistItems.isEmpty()) {
            appendLine("  None.")
        } else {
            context.watchlistItems.forEach { (symbol, signal) ->
                appendLine("  $symbol: $signal")
            }
        }
    }
}
