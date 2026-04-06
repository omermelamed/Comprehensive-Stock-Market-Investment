package com.investment.application

import com.investment.infrastructure.market.YahooFinanceAdapter
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate

/**
 * Fetches and normalizes benchmark (SPY) performance data for comparison against portfolio returns.
 * Uses Yahoo Finance historical adjusted close prices.
 * All methods degrade gracefully — returns null when data is unavailable.
 */
@Service
class BenchmarkService(private val yahooFinanceAdapter: YahooFinanceAdapter) {

    private val log = LoggerFactory.getLogger(javaClass)

    data class IndexPoint(val date: String, val index: BigDecimal)

    data class BenchmarkResult(
        val symbol: String,
        /** SPY % return over the analytics range period. */
        val periodReturnPct: BigDecimal,
        /** SPY indexed to 100 at the first available price in the range. */
        val indexedPoints: List<IndexPoint>
    )

    fun getBenchmark(symbol: String, fromDate: LocalDate, toDate: LocalDate): BenchmarkResult? {
        val prices = try {
            yahooFinanceAdapter.fetchHistoricalPrices(symbol, fromDate, toDate)
        } catch (e: Exception) {
            log.warn("Benchmark fetch failed for {}: {}", symbol, e.message)
            return null
        }

        if (prices.isEmpty()) {
            log.debug("No historical prices returned for {} in range {} to {}", symbol, fromDate, toDate)
            return null
        }

        val sorted = prices.entries.sortedBy { it.key }
        val startPrice = sorted.first().value
        if (startPrice.compareTo(BigDecimal.ZERO) == 0) return null

        val endPrice = sorted.last().value
        val periodReturnPct = (endPrice - startPrice)
            .divide(startPrice, 6, RoundingMode.HALF_UP)
            .multiply(BigDecimal("100"))
            .setScale(2, RoundingMode.HALF_UP)

        val indexedPoints = sorted.map { (date, price) ->
            val index = price.divide(startPrice, 6, RoundingMode.HALF_UP)
                .multiply(BigDecimal("100"))
                .setScale(2, RoundingMode.HALF_UP)
            IndexPoint(date = date.toString(), index = index)
        }

        return BenchmarkResult(symbol = symbol, periodReturnPct = periodReturnPct, indexedPoints = indexedPoints)
    }
}
