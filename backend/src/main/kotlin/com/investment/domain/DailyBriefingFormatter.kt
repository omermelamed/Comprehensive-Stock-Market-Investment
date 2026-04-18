package com.investment.domain

import java.math.BigDecimal
import java.math.RoundingMode
import java.time.format.DateTimeFormatter

object DailyBriefingFormatter {

    private val DATE_FORMAT = DateTimeFormatter.ofPattern("MMM d, yyyy")

    fun format(data: DailyBriefingData): String = buildString {
        appendLine("*Daily Portfolio Briefing — ${data.date.format(DATE_FORMAT)}*")
        appendLine()

        if (data.portfolioChangeAbsolute != null && data.portfolioChangePercent != null) {
            val absStr = formatMoney(data.portfolioChangeAbsolute)
            val pctStr = formatPercent(data.portfolioChangePercent)
            appendLine("Portfolio: $absStr ($pctStr) today")
            appendLine()
        }

        if (data.marketIndices.isNotEmpty()) {
            appendLine("*Market*")
            append(data.marketIndices.joinToString("  |  ") { idx ->
                "${idx.label} ${formatPercent(idx.dayChangePercent)}"
            })
            appendLine()
            appendLine()
        }

        val hasMovers = data.topGainers.isNotEmpty() || data.topLosers.isNotEmpty()
        if (hasMovers) {
            appendLine("*Top Movers*")
            if (data.topGainers.isNotEmpty()) {
                val gainersStr = data.topGainers.joinToString("  ") { "${it.symbol} ${formatPercent(it.dayChangePercent)}" }
                appendLine("📈 Gainers: $gainersStr")
            }
            if (data.topLosers.isNotEmpty()) {
                val losersStr = data.topLosers.joinToString("  ") { "${it.symbol} ${formatPercent(it.dayChangePercent)}" }
                appendLine("📉 Losers:  $losersStr")
            }
            appendLine()
        }

        if (data.sectorBreakdown.isNotEmpty()) {
            appendLine("*Sector Breakdown*")
            append(data.sectorBreakdown.joinToString("  |  ") { "${it.sector} ${it.portfolioPercent.setScale(1, RoundingMode.HALF_UP)}%" })
            appendLine()
            appendLine()
        }

        if (data.newsHeadlines.isNotEmpty()) {
            appendLine("*Headlines*")
            data.newsHeadlines.forEach { news ->
                appendLine("• ${news.symbol}: ${news.headline}")
            }
        }
    }.trimEnd()

    private fun formatMoney(amount: BigDecimal): String {
        val scaled = amount.setScale(2, RoundingMode.HALF_UP)
        return if (scaled >= BigDecimal.ZERO) "+\$$scaled" else "-\$${scaled.abs()}"
    }

    private fun formatPercent(pct: BigDecimal): String {
        val scaled = pct.setScale(2, RoundingMode.HALF_UP)
        return if (scaled >= BigDecimal.ZERO) "+${scaled}%" else "${scaled}%"
    }
}
