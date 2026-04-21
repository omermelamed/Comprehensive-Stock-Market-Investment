package com.investment.application

import com.investment.domain.MarketDataUnavailableException
import com.investment.domain.PortfolioCalculator
import com.investment.api.dto.HoldingResponse
import com.investment.infrastructure.AllocationRepository
import com.investment.infrastructure.HoldingsProjectionRepository
import com.investment.infrastructure.SnapshotRepository
import com.investment.infrastructure.TransactionRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Clock
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.UUID

@Service
class SnapshotService(
    private val snapshotRepository: SnapshotRepository,
    private val holdingsRepository: HoldingsProjectionRepository,
    private val allocationRepository: AllocationRepository,
    private val transactionRepository: TransactionRepository,
    private val marketDataService: MarketDataService,
    private val clock: Clock,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    companion object {
        private const val SNAPSHOT_CURRENCY = "USD"
    }

    /**
     * Minimal holdings view needed for snapshot math — derived from the transaction ledger
     * so it can represent portfolio state at any past date, not just today.
     */
    private data class HoldingState(
        val symbol: String,
        val track: String,
        val netQuantity: BigDecimal,
        val avgBuyPrice: BigDecimal,
        val totalCostBasis: BigDecimal,
    )

    /**
     * Computes what holdings looked like on [date] by replaying all transactions
     * up to and including that date. Only symbols with positive net quantity are returned.
     */
    private fun computeHoldingsAsOf(
        allTransactions: List<com.investment.infrastructure.TransactionLedgerRow>,
        date: LocalDate,
    ): List<HoldingState> {
        val txsUpToDate = allTransactions.filter {
            it.executedAt.atZone(ZoneOffset.UTC).toLocalDate() <= date
        }

        return txsUpToDate.groupBy { it.symbol.uppercase() }.mapNotNull { (symbol, txs) ->
            var totalBuyCost = BigDecimal.ZERO
            var totalBuyQty = BigDecimal.ZERO
            var netQty = BigDecimal.ZERO
            var track = "LONG"

            for (tx in txs) {
                track = tx.track
                when (tx.type.uppercase()) {
                    "BUY"   -> { totalBuyCost += tx.quantity * tx.pricePerUnit; totalBuyQty += tx.quantity; netQty += tx.quantity }
                    "SELL"  -> netQty -= tx.quantity
                    "SHORT" -> netQty -= tx.quantity
                    "COVER" -> netQty += tx.quantity
                }
            }

            if (netQty.compareTo(BigDecimal.ZERO) <= 0) return@mapNotNull null

            val avgBuyPrice = if (totalBuyQty.compareTo(BigDecimal.ZERO) > 0)
                totalBuyCost.divide(totalBuyQty, 8, RoundingMode.HALF_UP)
            else BigDecimal.ZERO

            HoldingState(symbol, track, netQty, avgBuyPrice, totalBuyCost)
        }
    }

    /**
     * Creates a snapshot for [date] using [holdings] as the portfolio state and [pricesForDate]
     * as closing prices. Falls back to [fallbackPrices] for symbols missing from [pricesForDate].
     */
    private fun createSnapshotWithPrices(
        userId: UUID,
        date: LocalDate,
        source: String,
        holdings: List<HoldingState>,
        pricesForDate: Map<String, BigDecimal>,
        fallbackPrices: Map<String, BigDecimal>,
    ) {
        if (snapshotRepository.existsForDate(userId, date)) {
            log.debug("Snapshot already exists for user {} date {} — skipping", userId, date)
            return
        }
        if (holdings.isEmpty()) {
            log.debug("No holdings as of {} for user {} — skipping snapshot", date, userId)
            return
        }

        val allocationsBySymbol = allocationRepository.findAll(userId).associateBy { it.symbol.uppercase() }

        val resolvedPrices = holdings.associate { h ->
            h.symbol to (pricesForDate[h.symbol] ?: fallbackPrices[h.symbol] ?: BigDecimal.ZERO)
        }

        val totalPortfolioValue = holdings.sumOf { h ->
            h.netQuantity * (resolvedPrices[h.symbol] ?: BigDecimal.ZERO)
        }

        if (totalPortfolioValue.compareTo(BigDecimal.ZERO) == 0) {
            log.warn("Skipping snapshot for user {} on {} — all prices resolved to zero (market likely closed)", userId, date)
            return
        }

        val holdingMetrics = holdings.map { h ->
            val allocation = allocationsBySymbol[h.symbol]
            PortfolioCalculator.computeHoldingMetrics(
                holding = h.toHoldingResponse(),
                currentPrice = resolvedPrices[h.symbol] ?: BigDecimal.ZERO,
                totalPortfolioValue = totalPortfolioValue,
                targetPercent = allocation?.targetPercentage,
                label = allocation?.label,
            )
        }

        val summary = PortfolioCalculator.computePortfolioSummary(holdingMetrics, SNAPSHOT_CURRENCY)

        snapshotRepository.save(
            userId = userId,
            date = date,
            totalValue = summary.totalValue,
            dailyPnl = summary.totalPnlAbsolute,
            source = source,
        )

        log.info("Snapshot created: user={} date={} totalValue={} source={}", userId, date, summary.totalValue, source)
    }

    /** Bridge from [HoldingState] to [HoldingResponse] for [PortfolioCalculator]. */
    private fun HoldingState.toHoldingResponse() = HoldingResponse(
        symbol = symbol,
        track = track,
        netQuantity = netQuantity,
        avgBuyPrice = avgBuyPrice,
        totalCostBasis = totalCostBasis,
        transactionCount = 0,
        firstBoughtAt = java.time.Instant.EPOCH,
        lastTransactionAt = java.time.Instant.EPOCH,
    )

    // ─── Public API ───────────────────────────────────────────────────────────

    /**
     * Creates a single snapshot for [date] using current holdings (from the live view).
     * For today this is exact; for past dates use [regenerateSnapshotsFrom] instead so
     * that each past snapshot only counts transactions that existed on that date.
     */
    fun createSnapshotForDate(userId: UUID, date: LocalDate, source: String) {
        val today = LocalDate.now(clock)

        // Convert live HoldingResponse → HoldingState
        val holdings = holdingsRepository.findAll(userId)
            .filter { it.netQuantity.compareTo(BigDecimal.ZERO) > 0 }
            .map { h -> HoldingState(h.symbol.uppercase(), h.track, h.netQuantity, h.avgBuyPrice, h.totalCostBasis) }

        if (holdings.isEmpty()) return

        val pricesForDate: Map<String, BigDecimal> = if (date.isBefore(today)) {
            holdings.associate { h ->
                val historicalMap = marketDataService.getHistoricalPrices(h.symbol, date, date)
                h.symbol to (historicalMap[date] ?: BigDecimal.ZERO)
            }
        } else {
            holdings.associate { h ->
                val price = try { marketDataService.getQuote(h.symbol).price }
                catch (e: MarketDataUnavailableException) { BigDecimal.ZERO }
                h.symbol to price
            }
        }

        createSnapshotWithPrices(userId, date, source, holdings, pricesForDate, emptyMap())
    }

    /**
     * Deletes all snapshots from [fromDate] through today and recreates them using
     * historically accurate per-date holdings (only transactions that existed on each date)
     * and historical closing prices with carry-forward for non-trading days.
     */
    fun regenerateSnapshotsFrom(userId: UUID, fromDate: LocalDate) {
        val today = LocalDate.now(clock)
        if (fromDate.isAfter(today)) return

        val deleted = snapshotRepository.deleteByDateRange(userId, fromDate, today)
        log.info("Regenerating snapshots for user {}: deleted {} snapshot(s) from {} to {}", userId, deleted, fromDate, today)

        // Load all transactions once — we'll filter per date inside the loop
        val allTransactions = transactionRepository.findAllOrderedByExecutedAtAsc(userId)

        // Determine all symbols that ever appear in the ledger
        val allSymbols = allTransactions.map { it.symbol.uppercase() }.distinct()

        // Batch-fetch historical prices for each symbol over the full range (one call per symbol)
        val historicalBySymbol: Map<String, Map<LocalDate, BigDecimal>> = allSymbols.associateWith { symbol ->
            try { marketDataService.getHistoricalPrices(symbol, fromDate, today) }
            catch (e: Exception) { log.warn("No history for {}: {}", symbol, e.message); emptyMap() }
        }

        val fallback = mutableMapOf<String, BigDecimal>()
        var date = fromDate
        var created = 0

        while (!date.isAfter(today)) {
            // Holdings as they existed on this specific date
            val holdingsOnDate = computeHoldingsAsOf(allTransactions, date)

            val pricesForDate: Map<String, BigDecimal> = if (date.isBefore(today)) {
                holdingsOnDate.associate { h ->
                    h.symbol to (historicalBySymbol[h.symbol]?.get(date) ?: BigDecimal.ZERO)
                }
            } else {
                holdingsOnDate.associate { h ->
                    val price = try { marketDataService.getQuote(h.symbol).price }
                    catch (e: MarketDataUnavailableException) { BigDecimal.ZERO }
                    h.symbol to price
                }
            }

            if (holdingsOnDate.isNotEmpty()) {
                createSnapshotWithPrices(userId, date, "REGENERATED", holdingsOnDate, pricesForDate, fallback)
                created++
            }

            pricesForDate.forEach { (sym, price) -> if (price > BigDecimal.ZERO) fallback[sym] = price }
            date = date.plusDays(1)
        }

        log.info("Regeneration complete for user {}: {} snapshot(s) created from {} to {}", userId, created, fromDate, today)
    }
}
