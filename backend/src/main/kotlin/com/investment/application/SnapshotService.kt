package com.investment.application

import com.investment.domain.MarketDataUnavailableException
import com.investment.domain.PortfolioCalculator
import com.investment.infrastructure.AllocationRepository
import com.investment.infrastructure.HoldingsProjectionRepository
import com.investment.infrastructure.SnapshotRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.time.LocalDate

@Service
class SnapshotService(
    private val snapshotRepository: SnapshotRepository,
    private val holdingsRepository: HoldingsProjectionRepository,
    private val allocationRepository: AllocationRepository,
    private val marketDataService: MarketDataService
) {

    private val log = LoggerFactory.getLogger(javaClass)

    companion object {
        private const val DEFAULT_CURRENCY = "USD"
    }

    fun createSnapshotForDate(date: LocalDate, source: String) {
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

        val prices = holdings.associate { holding ->
            val price = try {
                marketDataService.getQuote(holding.symbol).price
            } catch (e: MarketDataUnavailableException) {
                log.warn("Market data unavailable for {} during snapshot for date {} — using zero price", holding.symbol, date)
                BigDecimal.ZERO
            }
            holding.symbol.uppercase() to price
        }

        val totalPortfolioValue = holdings.sumOf { holding ->
            val price = prices[holding.symbol.uppercase()] ?: BigDecimal.ZERO
            holding.netQuantity * price
        }

        val holdingMetrics = holdings.map { holding ->
            val upperSymbol = holding.symbol.uppercase()
            val currentPrice = prices[upperSymbol] ?: BigDecimal.ZERO
            val allocation = allocationsBySymbol[upperSymbol]
            PortfolioCalculator.computeHoldingMetrics(
                holding = holding,
                currentPrice = currentPrice,
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
}
