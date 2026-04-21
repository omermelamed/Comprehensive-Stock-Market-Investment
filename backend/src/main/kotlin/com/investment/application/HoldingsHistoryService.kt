package com.investment.application

import com.investment.api.dto.HoldingsHistoryResponse
import com.investment.api.dto.SymbolHistoryPoint
import com.investment.api.dto.SymbolHistorySeries
import com.investment.api.dto.TransactionMarker
import com.investment.infrastructure.AllocationRepository
import com.investment.infrastructure.HoldingsProjectionRepository
import com.investment.infrastructure.TransactionRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Clock
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.concurrent.CompletableFuture
import java.util.concurrent.Executors

@Service
class HoldingsHistoryService(
    private val holdingsRepository: HoldingsProjectionRepository,
    private val allocationRepository: AllocationRepository,
    private val transactionRepository: TransactionRepository,
    private val marketDataService: MarketDataService,
    private val userProfileService: UserProfileService,
    private val clock: Clock,
) {
    private val log = LoggerFactory.getLogger(javaClass)
    private val executor = Executors.newFixedThreadPool(6)

    fun getHoldingsHistory(range: String): HoldingsHistoryResponse {
        val userId = RequestContext.get()
        val today = LocalDate.now(clock)
        val portfolioCurrency = userProfileService.getProfile()?.preferredCurrency ?: "USD"

        val labelMap = allocationRepository.findAll(userId)
            .associate { it.symbol.uppercase() to it.label }

        // Single DB call — group by symbol
        val allTransactions = transactionRepository.findAllOrderedByExecutedAtAsc(userId)
            .filter { it.type.uppercase() in setOf("BUY", "SELL") }
            .groupBy { it.symbol.uppercase() }

        val activeSymbols = holdingsRepository.findAll(userId)
            .filter { it.netQuantity.compareTo(BigDecimal.ZERO) > 0 }
            .map { it.symbol.uppercase() }

        // Resolve FX and native currency per symbol
        data class FxInfo(val nativeCurrency: String, val fxRate: BigDecimal)
        val fxBySymbol = activeSymbols.associateWith { symbol ->
            val currency = try { marketDataService.getQuote(symbol).currency } catch (e: Exception) { "USD" }
            val rate = try { marketDataService.getExchangeRate(currency, portfolioCurrency) } catch (e: Exception) { BigDecimal.ONE }
            FxInfo(currency, rate)
        }

        // Parallel historical price fetches
        val futures = activeSymbols.map { symbol ->
            val txs = allTransactions[symbol] ?: emptyList()
            val firstTxDate = txs.minByOrNull { it.executedAt }
                ?.executedAt?.atZone(ZoneOffset.UTC)?.toLocalDate() ?: today
            CompletableFuture.supplyAsync({
                try {
                    Triple(symbol, firstTxDate, marketDataService.getHistoricalPrices(symbol, firstTxDate, today))
                } catch (e: Exception) {
                    log.warn("Failed to fetch history for {}: {}", symbol, e.message)
                    Triple(symbol, firstTxDate, emptyMap<LocalDate, BigDecimal>())
                }
            }, executor)
        }

        val series = futures.map { it.join() }.mapNotNull { (symbol, firstTxDate, historicalPrices) ->
            if (historicalPrices.isEmpty()) return@mapNotNull null
            val transactions = allTransactions[symbol] ?: return@mapNotNull null
            val fx = fxBySymbol[symbol] ?: return@mapNotNull null

            val txByDate = transactions.groupBy { it.executedAt.atZone(ZoneOffset.UTC).toLocalDate() }

            // Running cost basis state — recomputed sequentially day by day
            var totalBuyCost = BigDecimal.ZERO
            var totalBuyQty = BigDecimal.ZERO
            var sharesHeld = BigDecimal.ZERO
            var lastKnownPrice: BigDecimal? = null
            val rawPoints = mutableListOf<SymbolHistoryPoint>()

            var date = firstTxDate
            while (!date.isAfter(today)) {
                // Apply all transactions for today before computing P&L
                txByDate[date]?.forEach { tx ->
                    when (tx.type.uppercase()) {
                        "BUY" -> {
                            totalBuyCost += tx.quantity.multiply(tx.pricePerUnit)
                            totalBuyQty += tx.quantity
                            sharesHeld += tx.quantity
                        }
                        "SELL" -> sharesHeld -= tx.quantity
                    }
                }

                val price = historicalPrices[date]?.also { lastKnownPrice = it } ?: lastKnownPrice
                date = date.plusDays(1)

                if (price == null) continue
                if (sharesHeld.compareTo(BigDecimal.ZERO) <= 0) continue
                if (totalBuyQty.compareTo(BigDecimal.ZERO) == 0) continue

                val avgCost = totalBuyCost.divide(totalBuyQty, 8, RoundingMode.HALF_UP)
                val pnlNative = (price - avgCost).multiply(sharesHeld)
                val pnlConverted = pnlNative.multiply(fx.fxRate).setScale(2, RoundingMode.HALF_UP)
                val pnlPercent = (price - avgCost)
                    .divide(avgCost, 6, RoundingMode.HALF_UP)
                    .multiply(BigDecimal("100"))
                    .setScale(2, RoundingMode.HALF_UP)

                rawPoints.add(
                    SymbolHistoryPoint(
                        date = date.minusDays(1).toString(),
                        pnlValue = pnlConverted,
                        price = price.setScale(4, RoundingMode.HALF_UP),
                        avgCost = avgCost.setScale(4, RoundingMode.HALF_UP),
                        sharesHeld = sharesHeld.setScale(8, RoundingMode.HALF_UP).stripTrailingZeros(),
                        pnlPercent = pnlPercent,
                    )
                )
            }

            if (rawPoints.isEmpty()) return@mapNotNull null

            // Anchor first point to 0: closing price on purchase day ≠ intraday transaction price
            val offset = rawPoints.first().pnlValue
            val points = if (offset.compareTo(BigDecimal.ZERO) == 0) rawPoints
            else rawPoints.map { it.copy(pnlValue = (it.pnlValue - offset).setScale(2, RoundingMode.HALF_UP)) }

            val txMarkers = transactions.map { tx ->
                TransactionMarker(
                    date = tx.executedAt.atZone(ZoneOffset.UTC).toLocalDate().toString(),
                    type = tx.type.uppercase(),
                    quantity = tx.quantity,
                    pricePerUnit = tx.pricePerUnit,
                )
            }

            SymbolHistorySeries(
                symbol = symbol,
                label = labelMap[symbol],
                points = points,
                periodReturnPct = points.lastOrNull()?.pnlPercent ?: BigDecimal.ZERO,
                transactions = txMarkers,
                nativeCurrency = fx.nativeCurrency,
            )
        }.sortedByDescending { it.periodReturnPct }

        return HoldingsHistoryResponse(range = range, series = series, currency = portfolioCurrency)
    }
}
