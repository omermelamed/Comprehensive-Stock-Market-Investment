package com.investment.application

import com.investment.api.dto.MonthlyFlowPreviewRequest
import com.investment.domain.TelegramMessageFormatter
import com.investment.infrastructure.TransactionRepository
import com.investment.infrastructure.ai.ClaudeClient
import com.investment.infrastructure.ai.ClaudeMessage
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Clock
import java.time.YearMonth
import java.time.ZoneOffset

/**
 * Generates plain-text Telegram message content for each scheduled message type.
 * Each type calls Claude with the portfolio context for a rich, emoji-enhanced message.
 */
@Service
class TelegramScheduledMessageContentGenerator(
    private val contextBuilder: TelegramContextBuilder,
    private val claudeClient: ClaudeClient,
    private val portfolioSummaryService: PortfolioSummaryService,
    private val analyticsService: AnalyticsService,
    private val allocationService: AllocationService,
    private val monthlyInvestmentService: MonthlyInvestmentService,
    private val transactionRepository: TransactionRepository,
    private val userProfileService: UserProfileService,
    private val clock: Clock
) {

    private val log = LoggerFactory.getLogger(javaClass)

    fun generate(messageType: String): String {
        return when (messageType.uppercase()) {
            "PORTFOLIO_SUMMARY"  -> generatePortfolioSummary()
            "PERFORMANCE_REPORT" -> generatePerformanceReport()
            "ALLOCATION_CHECK"   -> generateAllocationCheck()
            "INVESTMENT_REMINDER" -> generateInvestmentReminder()
            "TOP_MOVERS"         -> generateTopMovers()
            else -> "Unknown scheduled message type: $messageType"
        }
    }

    private fun generatePortfolioSummary(): String {
        val summary = portfolioSummaryService.getPortfolioSummary()
        val holdings = portfolioSummaryService.getHoldingsDashboard()

        val holdingSummaries = holdings.map { h ->
            TelegramMessageFormatter.HoldingSummary(
                symbol           = h.symbol,
                quantity         = h.quantity,
                avgCost          = h.avgBuyPrice,
                currentPrice     = h.currentPrice,
                nativeCurrency   = h.nativeCurrency,
                currentValue     = h.currentValue,
                pnlAbsolute      = h.pnlAbsolute,
                pnlPercent       = h.pnlPercent,
                portfolioPercent = h.currentPercent
            )
        }

        val richFallback = TelegramMessageFormatter.portfolioSummary(
            totalValue      = summary.totalValue,
            totalPnl        = summary.totalPnlAbsolute,
            totalPnlPercent = summary.totalPnlPercent,
            currency        = summary.currency,
            holdings        = holdingSummaries
        )

        val context = contextBuilder.build()

        val holdingLines = holdings
            .sortedByDescending { it.currentValue }
            .take(8)
            .joinToString("\n") { h ->
                "  ${h.symbol}: ${h.quantity.stripTrailingZeros().toPlainString()} shares, " +
                    "${summary.currency} ${h.currentValue.setScale(2, RoundingMode.HALF_UP)} " +
                    "(${h.pnlPercent.setScale(1, RoundingMode.HALF_UP)}%)"
            }

        val prompt = """
            You are a personal investment assistant sending a Telegram portfolio summary.
            Use *bold* (single asterisk) and emojis for visual hierarchy.
            Keep it concise and friendly — no markdown headers, no backticks.

            PORTFOLIO DATA:
            Total value: ${summary.currency} ${summary.totalValue.setScale(2, RoundingMode.HALF_UP)}
            Total P&L: ${summary.currency} ${summary.totalPnlAbsolute.setScale(2, RoundingMode.HALF_UP)} (${summary.totalPnlPercent.setScale(1, RoundingMode.HALF_UP)}%)

            Holdings (top 8 by value):
            $holdingLines

            PORTFOLIO CONTEXT:
            $context

            Write a Telegram-friendly portfolio summary message. Include:
            - Total portfolio value and overall P&L
            - Each holding with shares held, current value, and P&L percentage
            - A brief comment on portfolio health
        """.trimIndent()

        return callClaude(prompt, fallback = richFallback)
    }

    private fun generatePerformanceReport(): String {
        val analytics = analyticsService.getAnalytics("1Y")
        val context = contextBuilder.build()
        val currency = userProfileService.getProfile()?.preferredCurrency ?: "USD"

        val metrics = analytics.performanceMetrics
        val topGainers = analytics.positions
            .sortedByDescending { it.pnlPercent }
            .take(3)
            .joinToString(", ") { "${it.symbol} +${it.pnlPercent.setScale(1, RoundingMode.HALF_UP)}%" }
        val topLosers = analytics.positions
            .sortedBy { it.pnlPercent }
            .take(3)
            .joinToString(", ") { "${it.symbol} ${it.pnlPercent.setScale(1, RoundingMode.HALF_UP)}%" }

        val returnPct = metrics.snapshotPeriodReturnPct ?: metrics.costBasisReturnPct ?: BigDecimal.ZERO
        val totalPnl  = metrics.costBasisReturnAbsolute

        val prompt = """
            You are a personal investment assistant sending a Telegram performance report.
            Use *bold* (single asterisk) and emojis for visual hierarchy.
            Keep it concise and analytical — no markdown headers, no backticks.

            PERFORMANCE DATA (1 Year):
            Total return: ${returnPct.setScale(1, RoundingMode.HALF_UP)}%
            Total P&L: $currency ${totalPnl.setScale(2, RoundingMode.HALF_UP)}
            Max drawdown: ${metrics.maxDrawdownPct?.setScale(1, RoundingMode.HALF_UP) ?: "N/A"}%
            Sharpe ratio: ${metrics.sharpeRatio?.setScale(2, RoundingMode.HALF_UP) ?: "N/A"}

            Top gainers: $topGainers
            Top losers: $topLosers

            PORTFOLIO CONTEXT:
            $context

            Write a Telegram-friendly 1-year performance report. Include key metrics, best/worst positions, and a brief forward-looking comment.
        """.trimIndent()

        return callClaude(prompt, fallback = "*Performance Report*\n\nReturn: ${returnPct.setScale(1, RoundingMode.HALF_UP)}%")
    }

    private fun generateAllocationCheck(): String {
        val allocations = allocationService.getAllocations()
        val holdings = portfolioSummaryService.getHoldingsDashboard()
        val context = contextBuilder.build()

        val holdingsBySymbol = holdings.associateBy { it.symbol.uppercase() }
        val driftLines = allocations
            .filter { !it.isCategory }
            .joinToString("\n") { alloc ->
                val current = holdingsBySymbol[alloc.symbol.uppercase()]?.currentPercent ?: BigDecimal.ZERO
                val gap = alloc.targetPercentage - current
                val status = when {
                    gap > BigDecimal("2.0")  -> "UNDER"
                    gap < BigDecimal("-2.0") -> "OVER"
                    else                      -> "OK"
                }
                "  ${alloc.symbol}: ${current.setScale(1, RoundingMode.HALF_UP)}% / target ${alloc.targetPercentage.setScale(1, RoundingMode.HALF_UP)}% — $status"
            }

        val prompt = """
            You are a personal investment assistant sending a Telegram allocation check.
            Use *bold* (single asterisk) and emojis for visual hierarchy.
            Keep it actionable — no markdown headers, no backticks.

            ALLOCATION DRIFT:
            $driftLines

            PORTFOLIO CONTEXT:
            $context

            Write a Telegram-friendly allocation check. Highlight positions that need attention (significantly over or underweight) and suggest whether rebalancing action is needed.
        """.trimIndent()

        return callClaude(prompt, fallback = "*Allocation Check*\n\n$driftLines")
    }

    private fun generateInvestmentReminder(): String {
        val now = clock.instant().atZone(ZoneOffset.UTC)
        val currentMonth = YearMonth.of(now.year, now.month)
        val monthStart = currentMonth.atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant()
        val monthEnd   = currentMonth.atEndOfMonth().atStartOfDay(ZoneOffset.UTC).plusDays(1).toInstant()

        val transactions = transactionRepository.findAllOrderedByExecutedAtAsc()
        val investedThisMonth = transactions.any { tx ->
            tx.type == "BUY" && tx.executedAt >= monthStart && tx.executedAt < monthEnd
        }

        if (investedThisMonth) {
            return "*Investment Reminder*\n\nYou've already invested this month! Great job staying on track with your plan."
        }

        val profile = userProfileService.getProfile()
        val budget = profile?.monthlyInvestmentMax ?: BigDecimal("1000")
        val currency = profile?.preferredCurrency ?: "USD"

        val preview = try {
            monthlyInvestmentService.preview(MonthlyFlowPreviewRequest(budget = budget))
        } catch (e: Exception) {
            log.warn("Could not generate monthly flow preview for investment reminder: {}", e.message)
            return "*Investment Reminder*\n\nYou haven't invested yet this month. Head to your dashboard to start your monthly investment!"
        }

        val suggestions = preview.positions
            .filter { it.suggestedAmount > BigDecimal.ZERO }
            .sortedByDescending { it.suggestedAmount }
            .take(5)

        if (suggestions.isEmpty()) {
            return "*Investment Reminder*\n\nYour portfolio is on target — no underweight positions this month."
        }

        val suggestionLines = suggestions.joinToString("\n") { pos ->
            "  ${pos.symbol}: $currency ${pos.suggestedAmount.setScale(2, RoundingMode.HALF_UP)}"
        }

        return buildString {
            appendLine("*Investment Reminder*")
            appendLine()
            appendLine("You haven't invested yet this month!")
            appendLine()
            appendLine("*Suggested buys for your $currency ${"%.0f".format(budget)} budget:*")
            appendLine(suggestionLines)
            appendLine()
            append("Open your dashboard to confirm these allocations.")
        }.trimEnd()
    }

    private fun generateTopMovers(): String {
        val holdings = portfolioSummaryService.getHoldingsDashboard()

        val sorted = holdings.sortedByDescending { it.pnlPercent }
        val gainers = sorted.take(3).filter { it.pnlPercent > BigDecimal.ZERO }
        val losers  = sorted.takeLast(3).filter { it.pnlPercent < BigDecimal.ZERO }.reversed()

        val currency = userProfileService.getProfile()?.preferredCurrency ?: "USD"
        val context  = contextBuilder.build()

        val gainerLines = gainers.joinToString("\n") { h ->
            "  ${h.symbol}: +${h.pnlPercent.setScale(2, RoundingMode.HALF_UP)}% ($currency ${h.pnlAbsolute.setScale(2, RoundingMode.HALF_UP)})"
        }
        val loserLines = losers.joinToString("\n") { h ->
            "  ${h.symbol}: ${h.pnlPercent.setScale(2, RoundingMode.HALF_UP)}% ($currency ${h.pnlAbsolute.setScale(2, RoundingMode.HALF_UP)})"
        }

        val prompt = """
            You are a personal investment assistant sending a Telegram top movers update.
            Use *bold* (single asterisk) and emojis for visual hierarchy.
            Keep it brief and insightful — no markdown headers, no backticks.

            TOP GAINERS:
            $gainerLines

            TOP LOSERS:
            $loserLines

            PORTFOLIO CONTEXT:
            $context

            Write a Telegram-friendly top movers message. Briefly comment on why these movements might be happening and whether any action is warranted.
        """.trimIndent()

        val fallback = buildString {
            appendLine("*Top Movers*")
            if (gainers.isNotEmpty()) { appendLine(); appendLine("*Gainers:*"); appendLine(gainerLines) }
            if (losers.isNotEmpty())  { appendLine(); appendLine("*Losers:*");  appendLine(loserLines) }
        }.trimEnd()

        return callClaude(prompt, fallback = fallback)
    }

    private fun callClaude(prompt: String, fallback: String): String {
        return try {
            val result = claudeClient.complete(
                system = "You are a concise, friendly personal investment assistant for Telegram. Use plain text with *bold* and emojis. No markdown.",
                userMessage = prompt,
                maxTokens = 600
            )
            result.ifBlank { fallback }
        } catch (e: Exception) {
            log.warn("Claude call failed for scheduled message content: {}", e.message)
            fallback
        }
    }
}
