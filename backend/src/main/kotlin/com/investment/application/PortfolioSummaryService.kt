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
    private val marketDataService: MarketDataService,
    private val userProfileService: UserProfileService
) {

    private val log = LoggerFactory.getLogger(javaClass)

    companion object {
        private const val DEFAULT_CURRENCY = "USD"
    }

    /**
     * Fetches each holding's price in its native currency, then converts to [userCurrency]
     * using per-stock FX rates. Returns prices already in the user's display currency.
     * This ensures portfolio totals and allocation percentages are computed consistently.
     */
    private fun convertedPrices(
        symbols: List<String>,
        userCurrency: String
    ): Map<String, BigDecimal> {
        return symbols.associate { symbol ->
            val convertedPrice = try {
                val quote = marketDataService.getQuote(symbol)
                val rate = marketDataService.getExchangeRate(quote.currency, userCurrency)
                quote.price * rate
            } catch (e: MarketDataUnavailableException) {
                log.warn("Market data unavailable for {}, defaulting to zero price", symbol)
                BigDecimal.ZERO
            } catch (e: Exception) {
                log.warn("Price conversion failed for {}: {}", symbol, e.message)
                BigDecimal.ZERO
            }
            symbol.uppercase() to convertedPrice
        }
    }

    fun getHoldingsDashboard(): List<HoldingDashboardResponse> {
        val holdings = holdingsRepository.findAll()
        if (holdings.isEmpty()) return emptyList()

        val currency = userProfileService.getProfile()?.preferredCurrency ?: DEFAULT_CURRENCY
        val allocationsBySymbol = allocationRepository.findAll().associateBy { it.symbol.uppercase() }

        val prices = convertedPrices(holdings.map { it.symbol }, currency)

        val totalPortfolioValue = holdings.sumOf { h ->
            (prices[h.symbol.uppercase()] ?: BigDecimal.ZERO) * h.netQuantity
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
        val currency = userProfileService.getProfile()?.preferredCurrency ?: DEFAULT_CURRENCY
        val holdings = holdingsRepository.findAll()

        if (holdings.isEmpty()) {
            return PortfolioCalculator.computePortfolioSummary(emptyList(), currency)
        }

        val allocationsBySymbol = allocationRepository.findAll().associateBy { it.symbol.uppercase() }
        val prices = convertedPrices(holdings.map { it.symbol }, currency)

        val totalPortfolioValue = holdings.sumOf { h ->
            (prices[h.symbol.uppercase()] ?: BigDecimal.ZERO) * h.netQuantity
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

        return PortfolioCalculator.computePortfolioSummary(holdingMetrics, currency)
    }
}
