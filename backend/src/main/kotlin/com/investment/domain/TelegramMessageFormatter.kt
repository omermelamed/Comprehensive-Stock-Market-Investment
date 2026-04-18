package com.investment.domain

import java.math.BigDecimal
import java.math.RoundingMode

/**
 * Formats portfolio data as plain text suitable for Telegram.
 * Telegram bold: *text* (single asterisk in Markdown mode).
 * No markdown headers, no backticks.
 */
object TelegramMessageFormatter {

    data class DriftEntry(val symbol: String, val currentPct: BigDecimal, val targetPct: BigDecimal, val gapPct: BigDecimal)

    data class HoldingSummary(
        val symbol: String,
        val quantity: BigDecimal,
        val avgCost: BigDecimal,
        val currentPrice: BigDecimal,
        val nativeCurrency: String,
        val currentValue: BigDecimal,
        val pnlAbsolute: BigDecimal,
        val pnlPercent: BigDecimal,
        val portfolioPercent: BigDecimal
    )

    fun portfolioSummary(
        totalValue: BigDecimal,
        totalPnl: BigDecimal,
        totalPnlPercent: BigDecimal,
        currency: String,
        holdings: List<HoldingSummary>
    ): String = buildString {
        appendLine("*Portfolio Summary*")
        appendLine()
        appendLine("*Total:* $currency ${fmt(totalValue)}")
        val pnlSign = if (totalPnl >= BigDecimal.ZERO) "+" else ""
        appendLine("*P&L:* $pnlSign$currency ${fmt(totalPnl)} ($pnlSign${totalPnlPercent.setScale(1, RoundingMode.HALF_UP)}%)")
        appendLine("*Positions:* ${holdings.size}")

        if (holdings.isNotEmpty()) {
            appendLine()
            appendLine("━━━━━━━━━━━━━━━━━━━━")
            holdings.sortedByDescending { it.currentValue }.forEach { h ->
                appendLine()
                val hPnlSign = if (h.pnlPercent >= BigDecimal.ZERO) "+" else ""
                appendLine("*${h.symbol}*  ${hPnlSign}${h.pnlPercent.setScale(1, RoundingMode.HALF_UP)}%")
                appendLine("  ${h.quantity.stripTrailingZeros().toPlainString()} shares @ ${h.nativeCurrency} ${fmt(h.avgCost)}")
                appendLine("  Price: ${h.nativeCurrency} ${fmt(h.currentPrice)}")
                appendLine("  Value: $currency ${fmt(h.currentValue)}  (${h.portfolioPercent.setScale(1, RoundingMode.HALF_UP)}%)")
                appendLine("  P&L: $hPnlSign$currency ${fmt(h.pnlAbsolute)}")
            }
        }
    }.trimEnd()

    private fun fmt(v: BigDecimal): String = v.setScale(2, RoundingMode.HALF_UP).toPlainString()

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
        "Telegram bot is currently disabled. Enable it in your profile settings."

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
