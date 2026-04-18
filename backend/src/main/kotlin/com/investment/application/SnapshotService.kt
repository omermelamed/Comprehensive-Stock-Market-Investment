package com.investment.application

import com.investment.domain.MarketDataUnavailableException
import com.investment.domain.PortfolioCalculator
import com.investment.infrastructure.AllocationRepository
import com.investment.infrastructure.HoldingsProjectionRepository
import com.investment.infrastructure.SnapshotRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.time.Clock
import java.time.LocalDate

@Service
class SnapshotService(
    private val snapshotRepository: SnapshotRepository,
    private val holdingsRepository: HoldingsProjectionRepository,
    private val allocationRepository: AllocationRepository,
    private val marketDataService: MarketDataService,
    private val clock: Clock
) {

    private val log = LoggerFactory.getLogger(javaClass)

    companion object {
        private const val DEFAULT_CURRENCY = "USD"
    }

    /**
     * Creates a snapshot for [date] using the provided [pricesForDate] map.
     * If a symbol has no price in the map (non-trading day), uses the [fallbackPrices] map
     * (typically the most-recently-seen prices from a prior trading day).
     */
    private fun createSnapshotWithPrices(
        date: LocalDate,
        source: String,
        pricesForDate: Map<String, BigDecimal>,
        fallbackPrices: Map<String, BigDecimal>
    ) {
        if (snapshotRepository.existsForDate(date)) {
            log.debug("Snapshot already exists for date {} — skipping", date)
            return
        }

        val holdings = holdingsRepository.findAll()
        if (holdings.isEmpty()) {
            log.debug("No holdings found — skipping snapshot for date {}", date)
            return
        }

        val allocationsBySymbol = allocationRepository.findAll().associateBy { it.symbol.uppercase() }

        val resolvedPrices = holdings.associate { holding ->
            val upper = holding.symbol.uppercase()
            upper to (pricesForDate[upper] ?: fallbackPrices[upper] ?: BigDecimal.ZERO)
        }

        val totalPortfolioValue = holdings.sumOf { it.netQuantity * (resolvedPrices[it.symbol.uppercase()] ?: BigDecimal.ZERO) }

        val holdingMetrics = holdings.map { holding ->
            val upperSymbol = holding.symbol.uppercase()
            val allocation = allocationsBySymbol[upperSymbol]
            PortfolioCalculator.computeHoldingMetrics(
                holding = holding,
                currentPrice = resolvedPrices[upperSymbol] ?: BigDecimal.ZERO,
                totalPortfolioValue = totalPortfolioValue,
                targetPercent = allocation?.targetPercentage,
                label = allocation?.label
            )
        }

        val summary = PortfolioCalculator.computePortfolioSummary(holdingMetrics, DEFAULT_CURRENCY)

        snapshotRepository.save(
            date = date,
            totalValue = summary.totalValue,
            dailyPnl = summary.totalPnlAbsolute,
            source = source
        )

        log.info("Snapshot created for date {} with total_value={} source={}", date, summary.totalValue, source)
    }

    fun createSnapshotForDate(date: LocalDate, source: String) {
        val holdings = holdingsRepository.findAll()
        if (holdings.isEmpty()) return

        val today = LocalDate.now(clock)
        val pricesForDate: Map<String, BigDecimal> = if (date.isBefore(today)) {
            // Historical date: fetch closing prices from that specific day
            holdings.associate { holding ->
                val upper = holding.symbol.uppercase()
                val historicalMap = marketDataService.getHistoricalPrices(holding.symbol, date, date)
                upper to (historicalMap[date] ?: BigDecimal.ZERO)
            }
        } else {
            // Today: use live quotes
            holdings.associate { holding ->
                val price = try {
                    marketDataService.getQuote(holding.symbol).price
                } catch (e: MarketDataUnavailableException) {
                    log.warn("Market data unavailable for {} on {} — using zero", holding.symbol, date)
                    BigDecimal.ZERO
                }
                holding.symbol.uppercase() to price
            }
        }

        createSnapshotWithPrices(date, source, pricesForDate, emptyMap())
    }

    /**
     * Deletes all snapshots from [fromDate] through today and recreates them using
     * historically accurate closing prices for each date. Non-trading days use the
     * most-recently-seen price (carry-forward).
     */
    fun regenerateSnapshotsFrom(fromDate: LocalDate) {
        val today = LocalDate.now(clock)
        if (fromDate.isAfter(today)) return

        val holdings = holdingsRepository.findAll()
        if (holdings.isEmpty()) return

        val deleted = snapshotRepository.deleteByDateRange(fromDate, today)
        log.info("Regenerating snapshots: deleted {} existing snapshot(s) from {} to {}", deleted, fromDate, today)

        // Batch-fetch historical prices for all symbols over the full range (one HTTP call per symbol)
        val historicalBySymbol: Map<String, Map<LocalDate, BigDecimal>> = holdings.associate { holding ->
            holding.symbol.uppercase() to marketDataService.getHistoricalPrices(holding.symbol, fromDate, today)
        }

        // Carry-forward: fill non-trading days with the last known price
        val fallback = mutableMapOf<String, BigDecimal>()
        var date = fromDate
        var created = 0
        while (!date.isAfter(today)) {
            val pricesForDate: Map<String, BigDecimal> = if (date.isBefore(today)) {
                historicalBySymbol.mapValues { (_, dateMap) -> dateMap[date] ?: BigDecimal.ZERO }
            } else {
                // Today: use live quotes for the most accurate current value
                holdings.associate { holding ->
                    val price = try {
                        marketDataService.getQuote(holding.symbol).price
                    } catch (e: MarketDataUnavailableException) {
                        log.warn("Market data unavailable for {} — using zero", holding.symbol)
                        BigDecimal.ZERO
                    }
                    holding.symbol.uppercase() to price
                }
            }

            createSnapshotWithPrices(date, "REGENERATED", pricesForDate, fallback)

            // Update carry-forward with prices seen on this date
            pricesForDate.forEach { (sym, price) -> if (price > BigDecimal.ZERO) fallback[sym] = price }

            created++
            date = date.plusDays(1)
        }

        log.info("Regeneration complete: {} snapshot(s) created from {} to {}", created, fromDate, today)
    }
}
