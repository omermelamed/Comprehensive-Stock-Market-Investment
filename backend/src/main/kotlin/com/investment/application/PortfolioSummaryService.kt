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

    private data class PriceData(
        val convertedPrice: BigDecimal,
        val nativePrice: BigDecimal,
        val nativeCurrency: String,
        val fxRate: BigDecimal
    )

    private fun convertedPriceData(
        symbols: List<String>,
        userCurrency: String
    ): Map<String, PriceData> {
        return symbols.associate { symbol ->
            val data = try {
                val quote = marketDataService.getQuote(symbol)
                val rate = marketDataService.getExchangeRate(quote.currency, userCurrency)
                PriceData(quote.price * rate, quote.price, quote.currency, rate)
            } catch (e: MarketDataUnavailableException) {
                log.warn("Market data unavailable for {}, defaulting to zero price", symbol)
                PriceData(BigDecimal.ZERO, BigDecimal.ZERO, userCurrency, BigDecimal.ONE)
            } catch (e: Exception) {
                log.warn("Price conversion failed for {}: {}", symbol, e.message)
                PriceData(BigDecimal.ZERO, BigDecimal.ZERO, userCurrency, BigDecimal.ONE)
            }
            symbol.uppercase() to data
        }
    }

    fun getHoldingsDashboard(): List<HoldingDashboardResponse> {
        val userId = RequestContext.get()
        val holdings = holdingsRepository.findAll(userId)
        if (holdings.isEmpty()) return emptyList()

        val currency = userProfileService.getProfile()?.preferredCurrency ?: DEFAULT_CURRENCY
        val allocationsBySymbol = allocationRepository.findAll(userId).associateBy { it.symbol.uppercase() }

        val priceData = convertedPriceData(holdings.map { it.symbol }, currency)

        val totalPortfolioValue = holdings.sumOf { h ->
            (priceData[h.symbol.uppercase()]?.convertedPrice ?: BigDecimal.ZERO) * h.netQuantity
        }

        return holdings.map { holding ->
            val upperSymbol = holding.symbol.uppercase()
            val data = priceData[upperSymbol]
            val currentPrice = data?.convertedPrice ?: BigDecimal.ZERO
            val convertedHolding = holding.copy(totalCostBasis = holding.totalCostBasis * (data?.fxRate ?: BigDecimal.ONE))
            val allocation = allocationsBySymbol[upperSymbol]
            val metrics = PortfolioCalculator.computeHoldingMetrics(
                holding = convertedHolding,
                currentPrice = currentPrice,
                totalPortfolioValue = totalPortfolioValue,
                targetPercent = allocation?.targetPercentage,
                label = allocation?.label
            )
            PortfolioCalculator.toDto(metrics, data?.nativePrice ?: BigDecimal.ZERO, data?.nativeCurrency ?: currency)
        }
    }

    fun getPortfolioSummary(): PortfolioSummaryResponse {
        val userId = RequestContext.get()
        val currency = userProfileService.getProfile()?.preferredCurrency ?: DEFAULT_CURRENCY
        val holdings = holdingsRepository.findAll(userId)

        if (holdings.isEmpty()) {
            return PortfolioCalculator.computePortfolioSummary(emptyList(), currency)
        }

        val allocationsBySymbol = allocationRepository.findAll(userId).associateBy { it.symbol.uppercase() }
        val priceData = convertedPriceData(holdings.map { it.symbol }, currency)

        val totalPortfolioValue = holdings.sumOf { h ->
            (priceData[h.symbol.uppercase()]?.convertedPrice ?: BigDecimal.ZERO) * h.netQuantity
        }

        val holdingMetrics = holdings.map { holding ->
            val upperSymbol = holding.symbol.uppercase()
            val data = priceData[upperSymbol]
            val currentPrice = data?.convertedPrice ?: BigDecimal.ZERO
            val convertedHolding = holding.copy(totalCostBasis = holding.totalCostBasis * (data?.fxRate ?: BigDecimal.ONE))
            val allocation = allocationsBySymbol[upperSymbol]
            PortfolioCalculator.computeHoldingMetrics(
                holding = convertedHolding,
                currentPrice = currentPrice,
                totalPortfolioValue = totalPortfolioValue,
                targetPercent = allocation?.targetPercentage,
                label = allocation?.label
            )
        }

        return PortfolioCalculator.computePortfolioSummary(holdingMetrics, currency)
    }
}
