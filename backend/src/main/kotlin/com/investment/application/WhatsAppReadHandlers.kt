package com.investment.application

import com.investment.api.dto.AddWatchlistItemRequest
import com.investment.api.dto.ChatRequest
import com.investment.domain.WhatsAppMessageFormatter
import com.investment.domain.WhatsAppMessageFormatter.DriftEntry
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.math.RoundingMode

@Service
class WhatsAppReadHandlers(
    private val portfolioSummaryService: PortfolioSummaryService,
    private val allocationService: AllocationService,
    private val watchlistService: WatchlistService,
    private val chatService: ChatService
) {

    private val log = LoggerFactory.getLogger(javaClass)

    fun portfolioStatus(): String {
        return try {
            val summary = portfolioSummaryService.getPortfolioSummary()
            val holdings = portfolioSummaryService.getHoldingsDashboard()

            val topHoldings = holdings
                .sortedByDescending { it.currentValue }
                .take(5)
                .map { it.symbol to it.currentValue }

            WhatsAppMessageFormatter.portfolioSummary(
                totalValue   = summary.totalValue,
                currency     = summary.currency,
                topHoldings  = topHoldings
            )
        } catch (e: Exception) {
            log.warn("portfolioStatus failed: {}", e.message)
            WhatsAppMessageFormatter.error("could not load portfolio data")
        }
    }

    fun allocationCheck(): String {
        return try {
            val holdings = portfolioSummaryService.getHoldingsDashboard()
            val drifts = holdings.map { h ->
                DriftEntry(
                    symbol     = h.symbol,
                    currentPct = h.currentPercent,
                    targetPct  = h.targetPercent ?: BigDecimal.ZERO,
                    gapPct     = (h.targetPercent ?: BigDecimal.ZERO) - h.currentPercent
                )
            }
            WhatsAppMessageFormatter.allocationCheck(drifts)
        } catch (e: Exception) {
            log.warn("allocationCheck failed: {}", e.message)
            WhatsAppMessageFormatter.error("could not load allocation data")
        }
    }

    fun topPerformers(): String {
        return try {
            val holdings = portfolioSummaryService.getHoldingsDashboard()
            val sorted = holdings.sortedByDescending { it.pnlPercent }
            val gainers = sorted
                .filter { it.pnlPercent > BigDecimal.ZERO }
                .take(3)
                .map { it.symbol to it.pnlPercent }
            val losers = sorted
                .filter { it.pnlPercent < BigDecimal.ZERO }
                .takeLast(3)
                .map { it.symbol to it.pnlPercent }
            WhatsAppMessageFormatter.topPerformers(gainers, losers)
        } catch (e: Exception) {
            log.warn("topPerformers failed: {}", e.message)
            WhatsAppMessageFormatter.error("could not load performance data")
        }
    }

    fun watchlistQuery(): String {
        return try {
            val items = watchlistService.listItems()
            if (items.isEmpty()) return "Your watchlist is empty."
            val lines = items.joinToString("\n") { item ->
                val signal = item.signal.takeIf { it != "PENDING" } ?: "not analysed"
                "  ${item.symbol}: $signal"
            }
            "*Watchlist*\n$lines"
        } catch (e: Exception) {
            log.warn("watchlistQuery failed: {}", e.message)
            WhatsAppMessageFormatter.error("could not load watchlist")
        }
    }

    fun stockAnalysis(symbol: String): String {
        return try {
            // Find the watchlist item by symbol; add temporarily if not present
            val items = watchlistService.listItems()
            val item = items.firstOrNull { it.symbol.equals(symbol, ignoreCase = true) }
                ?: watchlistService.addItem(AddWatchlistItemRequest(symbol = symbol.uppercase(), assetType = "STOCK"))

            val analysed = watchlistService.listItems()
                .firstOrNull { it.id == item.id }
                ?: item

            @Suppress("UNCHECKED_CAST")
            val summary = (analysed.fullAnalysis?.get("summary") as? String)
                ?: analysed.signalSummary
                ?: "No analysis available yet."
            val signal = analysed.signal.takeIf { it != "PENDING" } ?: "pending"
            "*${symbol.uppercase()} Analysis*\nSignal: $signal\n$summary"
        } catch (e: Exception) {
            log.warn("stockAnalysis failed for {}: {}", symbol, e.message)
            WhatsAppMessageFormatter.error("could not analyse $symbol")
        }
    }

    fun conceptQuestion(question: String): String {
        return try {
            val response = chatService.chat(ChatRequest(message = question, history = emptyList()))
            response.reply
        } catch (e: Exception) {
            log.warn("conceptQuestion failed: {}", e.message)
            WhatsAppMessageFormatter.error("could not answer your question right now")
        }
    }
}
