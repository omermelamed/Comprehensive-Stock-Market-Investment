package com.investment.domain

import java.math.BigDecimal
import java.math.RoundingMode

/**
 * Formats portfolio data as plain text suitable for WhatsApp.
 * WhatsApp bold: *text* (single asterisk).
 * No markdown headers, no backticks.
 */
object WhatsAppMessageFormatter {

    data class DriftEntry(val symbol: String, val currentPct: BigDecimal, val targetPct: BigDecimal, val gapPct: BigDecimal)

    fun portfolioSummary(
        totalValue: BigDecimal,
        currency: String,
        topHoldings: List<Pair<String, BigDecimal>>
    ): String = buildString {
        appendLine("*Portfolio Summary*")
        appendLine("Total value: *$currency ${totalValue.setScale(2, RoundingMode.HALF_UP)}*")
        if (topHoldings.isNotEmpty()) {
            appendLine()
            appendLine("Holdings:")
            topHoldings.forEach { (symbol, value) ->
                appendLine("  $symbol: $currency ${value.setScale(2, RoundingMode.HALF_UP)}")
            }
        }
    }.trimEnd()

    fun allocationCheck(drifts: List<DriftEntry>): String = buildString {
        appendLine("*Allocation Check*")
        if (drifts.isEmpty()) {
            append("No target allocations configured.")
            return@buildString
        }
        drifts.forEach { d ->
            val status = when {
                d.gapPct > BigDecimal("2.0")  -> "UNDER"
                d.gapPct < BigDecimal("-2.0") -> "OVER"
                else                           -> "OK"
            }
            appendLine("  ${d.symbol}: ${d.currentPct.setScale(1, RoundingMode.HALF_UP)}% (target ${d.targetPct.setScale(1, RoundingMode.HALF_UP)}%) — $status")
        }
    }.trimEnd()

    fun topPerformers(
        gainers: List<Pair<String, BigDecimal>>,
        losers: List<Pair<String, BigDecimal>>
    ): String = buildString {
        appendLine("*Top Performers*")
        if (gainers.isNotEmpty()) {
            appendLine("Gainers:")
            gainers.forEach { (sym, pct) ->
                appendLine("  $sym: +${pct.setScale(2, RoundingMode.HALF_UP)}%")
            }
        }
        if (losers.isNotEmpty()) {
            if (gainers.isNotEmpty()) appendLine()
            appendLine("Losers:")
            losers.forEach { (sym, pct) ->
                appendLine("  $sym: ${pct.setScale(2, RoundingMode.HALF_UP)}%")
            }
        }
        if (gainers.isEmpty() && losers.isEmpty()) {
            append("No holdings to compare.")
        }
    }.trimEnd()

    fun confirmationCard(action: String, details: List<Pair<String, String>>): String = buildString {
        appendLine("*Confirm: $action*")
        details.forEach { (key, value) ->
            appendLine("  $key: $value")
        }
        appendLine()
        append("Reply *yes* to confirm or *no* to cancel.")
    }.trimEnd()

    fun success(message: String): String = "Done! $message"

    fun cancelled(): String = "Cancelled."

    fun error(message: String): String = "Sorry, something went wrong: $message"

    fun fallback(): String =
        "I didn't understand that. You can ask about your portfolio, allocation, top performers, or say something like \"buy 5 VOO at 490\"."

    fun botDisabled(): String =
        "WhatsApp bot is currently disabled. Enable it in your profile settings."

    fun monthlyFlowSummary(budget: BigDecimal, currency: String, suggestions: List<Pair<String, BigDecimal>>): String = buildString {
        appendLine("*Monthly Investment Preview*")
        appendLine("Budget: *$currency ${budget.setScale(2, RoundingMode.HALF_UP)}*")
        appendLine()
        if (suggestions.isEmpty()) {
            appendLine("No underweight positions found. Portfolio is on target.")
        } else {
            appendLine("Suggested buys:")
            suggestions.forEach { (sym, amount) ->
                if (amount > BigDecimal.ZERO) {
                    appendLine("  $sym: $currency ${amount.setScale(2, RoundingMode.HALF_UP)}")
                }
            }
        }
        appendLine()
        append("Reply *yes* to confirm and log these transactions, or *no* to cancel.")
    }.trimEnd()
}
