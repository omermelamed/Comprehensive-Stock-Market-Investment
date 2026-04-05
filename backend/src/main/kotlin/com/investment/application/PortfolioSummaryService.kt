package com.investment.application

import com.investment.api.dto.HoldingDashboardResponse
import com.investment.api.dto.PortfolioSummaryResponse
import com.investment.domain.MarketDataUnavailableException
import com.investment.domain.PortfolioCalculator
import com.investment.infrastructure.AllocationRepository
import com.investment.infrastructure.HoldingsProjectionRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.math.BigDecimal

@Service
class PortfolioSummaryService(
    private val holdingsRepository: HoldingsProjectionRepository,
    private val allocationRepository: AllocationRepository,
    private val marketDataService: MarketDataService
) {

    private val log = LoggerFactory.getLogger(javaClass)

    companion object {
        private const val DEFAULT_CURRENCY = "USD"
    }

    fun getHoldingsDashboard(): List<HoldingDashboardResponse> {
        val holdings = holdingsRepository.findAll()
        if (holdings.isEmpty()) return emptyList()

        val allocationsBySymbol = allocationRepository.findAll().associateBy { it.symbol.uppercase() }

        val prices = holdings.associate { holding ->
            val price = try {
                marketDataService.getQuote(holding.symbol).price
            } catch (e: MarketDataUnavailableException) {
                log.warn("Market data unavailable for {}, defaulting to zero price", holding.symbol)
                BigDecimal.ZERO
            }
            holding.symbol.uppercase() to price
        }

        val totalPortfolioValue = holdings.sumOf { holding ->
            val price = prices[holding.symbol.uppercase()] ?: BigDecimal.ZERO
            holding.netQuantity * price
        }

        return holdings.map { holding ->
            val upperSymbol = holding.symbol.uppercase()
            val currentPrice = prices[upperSymbol] ?: BigDecimal.ZERO
            val allocation = allocationsBySymbol[upperSymbol]
            val metrics = PortfolioCalculator.computeHoldingMetrics(
                holding = holding,
                currentPrice = currentPrice,
                totalPortfolioValue = totalPortfolioValue,
                targetPercent = allocation?.targetPercentage,
                label = allocation?.label
            )
            PortfolioCalculator.toDto(metrics)
        }
    }

    fun getPortfolioSummary(): PortfolioSummaryResponse {
        val holdings = holdingsRepository.findAll()
        if (holdings.isEmpty()) {
            return PortfolioCalculator.computePortfolioSummary(emptyList(), DEFAULT_CURRENCY)
        }

        val allocationsBySymbol = allocationRepository.findAll().associateBy { it.symbol.uppercase() }

        val prices = holdings.associate { holding ->
            val price = try {
                marketDataService.getQuote(holding.symbol).price
            } catch (e: MarketDataUnavailableException) {
                log.warn("Market data unavailable for {}, defaulting to zero price", holding.symbol)
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

        return PortfolioCalculator.computePortfolioSummary(holdingMetrics, DEFAULT_CURRENCY)
    }
}
