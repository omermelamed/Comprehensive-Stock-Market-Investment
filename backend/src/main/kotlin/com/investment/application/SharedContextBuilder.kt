package com.investment.application

import com.investment.domain.MarketDataUnavailableException
import com.investment.infrastructure.AllocationRepository
import com.investment.infrastructure.HoldingsProjectionRepository
import com.investment.infrastructure.WatchlistRepository
import org.springframework.stereotype.Component
import java.math.BigDecimal
import java.math.RoundingMode

@Component
class SharedContextBuilder(
    private val userProfileService: UserProfileService,
    private val holdingsRepository: HoldingsProjectionRepository,
    private val allocationRepository: AllocationRepository,
    private val watchlistRepository: WatchlistRepository,
    private val marketDataService: MarketDataService
) {

    data class PortfolioContext(
        val currency: String,
        val riskLevel: String,
        val monthlyBudget: BigDecimal,
        val tracksEnabled: List<String>,
        val portfolioTotal: BigDecimal,
        val contextString: String
    )

    fun build(): PortfolioContext {
        val profile = userProfileService.getProfile()
        val currency = profile?.preferredCurrency ?: "USD"
        val riskLevel = profile?.riskLevel ?: "MODERATE"
        val monthlyBudget = profile?.monthlyInvestmentMax ?: BigDecimal.ZERO
        val tracksEnabled = profile?.tracksEnabled ?: emptyList()

        val holdings = holdingsRepository.findAll().filter { it.track.uppercase() == "LONG" }

        val prices = holdings.associate { h ->
            h.symbol.uppercase() to try {
                val quote = marketDataService.getQuote(h.symbol)
                val rate = marketDataService.getExchangeRate(quote.currency, currency)
                (quote.price * rate).setScale(2, RoundingMode.HALF_UP)
            } catch (e: MarketDataUnavailableException) {
                BigDecimal.ZERO
            } catch (e: Exception) {
                BigDecimal.ZERO
            }
        }

        val portfolioTotal = holdings.sumOf { h ->
            (prices[h.symbol.uppercase()] ?: BigDecimal.ZERO) * h.netQuantity
        }.setScale(2, RoundingMode.HALF_UP)

        val contextString = buildString {
            appendLine("Monthly investment budget: $monthlyBudget $currency")
            appendLine("Risk profile: $riskLevel")
            appendLine("Active tracks: ${tracksEnabled.joinToString(", ").ifEmpty { "LONG" }}")
            appendLine()

            if (holdings.isEmpty()) {
                appendLine("Holdings: none yet")
            } else {
                appendLine("Portfolio total: $portfolioTotal $currency")
                appendLine("Holdings:")
                holdings.forEach { h ->
                    val price = prices[h.symbol.uppercase()] ?: BigDecimal.ZERO
                    val value = (price * h.netQuantity).setScale(2, RoundingMode.HALF_UP)
                    val pct = if (portfolioTotal.compareTo(BigDecimal.ZERO) != 0) {
                        value.divide(portfolioTotal, 4, RoundingMode.HALF_UP)
                            .multiply(BigDecimal("100")).setScale(1, RoundingMode.HALF_UP)
                    } else BigDecimal.ZERO
                    appendLine("  ${h.symbol}: ${h.netQuantity} shares × $price $currency = $value $currency ($pct% of portfolio)")
                }
            }

            appendLine()
            val allocations = allocationRepository.findAll()
            if (allocations.isNotEmpty()) {
                appendLine("Target allocations:")
                allocations.forEach { a ->
                    appendLine("  ${a.symbol}: ${a.targetPercentage}% target")
                }
            }

            appendLine()
            val watchlistSignals = watchlistRepository.findAll().filter { !it.signal.isNullOrBlank() }
            if (watchlistSignals.isNotEmpty()) {
                appendLine("Watchlist signals:")
                watchlistSignals.forEach { w ->
                    appendLine("  ${w.symbol}: ${w.signal}")
                }
            }
        }

        return PortfolioContext(
            currency = currency,
            riskLevel = riskLevel,
            monthlyBudget = monthlyBudget,
            tracksEnabled = tracksEnabled,
            portfolioTotal = portfolioTotal,
            contextString = contextString
        )
    }
}
