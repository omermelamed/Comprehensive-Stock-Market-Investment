package com.investment.domain

import java.math.BigDecimal
import java.math.RoundingMode

object RealizedPnlCalculator {

    data class TransactionEntry(
        val symbol: String,
        val type: String, // BUY, SELL, SHORT, COVER
        val quantity: BigDecimal,
        val pricePerUnit: BigDecimal,
        val executedAt: java.time.Instant
    )

    data class RealizedTrade(
        val symbol: String,
        val quantity: BigDecimal,
        val buyPrice: BigDecimal,
        val sellPrice: BigDecimal,
        val pnl: BigDecimal,
        val pnlPercent: BigDecimal,
        val closedAt: java.time.Instant
    )

    data class RealizedPnlResult(
        val trades: List<RealizedTrade>,
        val totalRealizedPnl: BigDecimal,
        val totalRealizedPnlBySymbol: Map<String, BigDecimal>
    )

    /**
     * FIFO-matches BUY→SELL and SHORT→COVER to compute realized P&L.
     * Transactions must be pre-sorted by executedAt ascending.
     */
    fun compute(transactions: List<TransactionEntry>): RealizedPnlResult {
        val bySymbol = transactions.groupBy { it.symbol.uppercase() }
        val allTrades = mutableListOf<RealizedTrade>()

        for ((symbol, txns) in bySymbol) {
            val sorted = txns.sortedBy { it.executedAt }

            val buyQueue = ArrayDeque<Pair<BigDecimal, BigDecimal>>() // qty, price
            val shortQueue = ArrayDeque<Pair<BigDecimal, BigDecimal>>()

            for (tx in sorted) {
                when (tx.type.uppercase()) {
                    "BUY" -> buyQueue.addLast(tx.quantity to tx.pricePerUnit)
                    "SELL" -> {
                        var remaining = tx.quantity
                        while (remaining.compareTo(BigDecimal.ZERO) > 0 && buyQueue.isNotEmpty()) {
                            val (bQty, bPrice) = buyQueue.first()
                            val matched = remaining.min(bQty)
                            val pnl = (tx.pricePerUnit - bPrice) * matched
                            val costBasis = bPrice * matched
                            val pnlPct = if (costBasis.compareTo(BigDecimal.ZERO) > 0) {
                                pnl.divide(costBasis, 4, RoundingMode.HALF_UP)
                                    .multiply(BigDecimal("100")).setScale(2, RoundingMode.HALF_UP)
                            } else {
                                BigDecimal.ZERO
                            }
                            allTrades.add(
                                RealizedTrade(
                                    symbol = symbol,
                                    quantity = matched,
                                    buyPrice = bPrice,
                                    sellPrice = tx.pricePerUnit,
                                    pnl = pnl.setScale(2, RoundingMode.HALF_UP),
                                    pnlPercent = pnlPct,
                                    closedAt = tx.executedAt
                                )
                            )
                            remaining -= matched
                            if (matched.compareTo(bQty) >= 0) {
                                buyQueue.removeFirst()
                            } else {
                                buyQueue[0] = (bQty - matched) to bPrice
                            }
                        }
                    }
                    "SHORT" -> shortQueue.addLast(tx.quantity to tx.pricePerUnit)
                    "COVER" -> {
                        var remaining = tx.quantity
                        while (remaining.compareTo(BigDecimal.ZERO) > 0 && shortQueue.isNotEmpty()) {
                            val (sQty, sPrice) = shortQueue.first()
                            val matched = remaining.min(sQty)
                            val pnl = (sPrice - tx.pricePerUnit) * matched
                            val costBasis = sPrice * matched
                            val pnlPct = if (costBasis.compareTo(BigDecimal.ZERO) > 0) {
                                pnl.divide(costBasis, 4, RoundingMode.HALF_UP)
                                    .multiply(BigDecimal("100")).setScale(2, RoundingMode.HALF_UP)
                            } else {
                                BigDecimal.ZERO
                            }
                            allTrades.add(
                                RealizedTrade(
                                    symbol = symbol,
                                    quantity = matched,
                                    buyPrice = sPrice,
                                    sellPrice = tx.pricePerUnit,
                                    pnl = pnl.setScale(2, RoundingMode.HALF_UP),
                                    pnlPercent = pnlPct,
                                    closedAt = tx.executedAt
                                )
                            )
                            remaining -= matched
                            if (matched.compareTo(sQty) >= 0) {
                                shortQueue.removeFirst()
                            } else {
                                shortQueue[0] = (sQty - matched) to sPrice
                            }
                        }
                    }
                }
            }
        }

        val totalPnl = allTrades.sumOf { it.pnl }.setScale(2, RoundingMode.HALF_UP)
        val bySymbolPnl = allTrades.groupBy { it.symbol }.mapValues { (_, trades) ->
            trades.sumOf { it.pnl }.setScale(2, RoundingMode.HALF_UP)
        }

        return RealizedPnlResult(
            trades = allTrades.sortedByDescending { it.closedAt },
            totalRealizedPnl = totalPnl,
            totalRealizedPnlBySymbol = bySymbolPnl
        )
    }
}
