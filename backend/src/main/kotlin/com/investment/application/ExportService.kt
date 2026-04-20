package com.investment.application

import com.investment.domain.ExportFormatter
import com.investment.domain.UnrealizedPnlCalculator
import com.investment.infrastructure.TransactionRepository
import org.springframework.stereotype.Service
import java.math.BigDecimal

/**
 * Assembles export payloads for holdings, transactions, and per-symbol P&L reports.
 *
 * All three reports are exported as raw byte arrays so the controller can
 * set the correct Content-Type and Content-Disposition headers without any
 * business logic leaking into the HTTP layer.
 */
@Service
class ExportService(
    private val portfolioSummaryService: PortfolioSummaryService,
    private val transactionRepository: TransactionRepository
) {

    /**
     * Exports the current holdings snapshot.
     * Each row = one holding position with basic metrics.
     */
    fun exportHoldings(format: String): ByteArray {
        val holdings = portfolioSummaryService.getHoldingsDashboard()

        val headers = listOf(
            "Symbol", "Track", "Net Quantity", "Avg Buy Price",
            "Cost Basis", "Current Price", "Current Value",
            "Unrealized P&L", "Unrealized P&L %", "Allocation %"
        )

        val rows: List<List<Any?>> = holdings.map { h ->
            listOf(
                h.symbol,
                h.track,
                h.quantity,
                h.avgBuyPrice,
                h.costBasis,
                h.currentPrice,
                h.currentValue,
                h.pnlAbsolute,
                h.pnlPercent,
                h.currentPercent
            )
        }

        return ExportFormatter.format(headers, rows, format)
    }

    /**
     * Exports the full transaction ledger in chronological order.
     */
    fun exportTransactions(format: String): ByteArray {
        val userId = RequestContext.get()
        val transactions = transactionRepository.findAll(userId, page = 0, size = Int.MAX_VALUE)

        val headers = listOf(
            "ID", "Symbol", "Type", "Track",
            "Quantity", "Price Per Unit", "Total Value",
            "Notes", "Executed At"
        )

        val rows: List<List<Any?>> = transactions.map { t ->
            listOf(
                t.id.toString(),
                t.symbol,
                t.type,
                t.track,
                t.quantity,
                t.pricePerUnit,
                t.totalValue,
                t.notes,
                t.executedAt.toString()
            )
        }

        return ExportFormatter.format(headers, rows, format)
    }

    /**
     * Exports a per-symbol unrealized P&L report.
     * Columns: symbol, cost basis, current value, unrealized P&L, unrealized P&L %.
     */
    fun exportPerformance(format: String): ByteArray {
        val holdings = portfolioSummaryService.getHoldingsDashboard()
        if (holdings.isEmpty()) return ExportFormatter.format(performanceHeaders(), emptyList(), format)

        val totalValue = holdings.sumOf { it.currentValue }

        val inputs = holdings.map { h ->
            UnrealizedPnlCalculator.PositionInput(
                symbol = h.symbol,
                label = h.label,
                currentValue = h.currentValue,
                costBasis = h.costBasis
            )
        }

        val pnlRows = UnrealizedPnlCalculator.compute(inputs, totalValue)

        val rows: List<List<Any?>> = pnlRows.map { p ->
            listOf(
                p.symbol,
                p.label,
                p.costBasis,
                p.currentValue,
                p.pnlAbsolute,
                p.pnlPercent,
                p.portfolioWeightPct
            )
        }

        return ExportFormatter.format(performanceHeaders(), rows, format)
    }

    private fun performanceHeaders() = listOf(
        "Symbol", "Label", "Cost Basis", "Current Value",
        "Unrealized P&L", "Unrealized P&L %", "Portfolio Weight %"
    )
}
