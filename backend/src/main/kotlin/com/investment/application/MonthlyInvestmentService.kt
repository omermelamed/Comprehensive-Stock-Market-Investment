package com.investment.application

import com.investment.api.dto.MonthlyFlowConfirmRequest
import com.investment.api.dto.MonthlyFlowConfirmResponse
import com.investment.api.dto.MonthlyFlowPreviewRequest
import com.investment.api.dto.MonthlyFlowPreviewResponse
import com.investment.api.dto.TransactionRequest
import com.investment.domain.MonthlyAllocationCalculator
import com.investment.infrastructure.AllocationRepository
import com.investment.infrastructure.HoldingsProjectionRepository
import com.investment.infrastructure.market.AlphaVantageAdapter
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Instant

@Service
class MonthlyInvestmentService(
    private val holdingsRepository: HoldingsProjectionRepository,
    private val allocationRepository: AllocationRepository,
    private val marketDataService: MarketDataService,
    private val transactionService: TransactionService,
    private val userProfileService: UserProfileService,
    private val alphaVantageAdapter: AlphaVantageAdapter
) {

    private val log = LoggerFactory.getLogger(javaClass)

    fun preview(request: MonthlyFlowPreviewRequest): MonthlyFlowPreviewResponse {
        require(request.budget > BigDecimal.ZERO) { "Budget must be greater than zero" }

        val holdings = holdingsRepository.findAll()
        val allAllocations = allocationRepository.findAll()
        // Only pass leaf allocations to the calculator — skip category parents
        val allocations = allAllocations.filter { !it.isCategory }
        val currency = userProfileService.getProfile()?.preferredCurrency ?: "USD"

        val symbols = (holdings.map { it.symbol } + allocations.map { it.symbol })
            .map { it.uppercase() }
            .distinct()

        data class QuoteInfo(val priceInUserCurrency: BigDecimal, val rawPrice: BigDecimal, val currency: String)

        val missing = mutableListOf<String>()
        val quoteInfo = mutableMapOf<String, QuoteInfo>()
        val prices = symbols.mapNotNull { symbol ->
            try {
                val quote = marketDataService.getQuote(symbol)
                val rate = marketDataService.getExchangeRate(quote.currency, currency)
                quoteInfo[symbol] = QuoteInfo(quote.price * rate, quote.price, quote.currency)
                symbol to (quote.price * rate)
            } catch (e: Exception) {
                missing.add(symbol)
                null
            }
        }.toMap()

        val result = MonthlyAllocationCalculator.compute(holdings, allocations, prices, request.budget)

        val enriched = result.copy(
            positions = result.positions.map { pos ->
                val qi = quoteInfo[pos.symbol.uppercase()]
                val fundamentals = try {
                    alphaVantageAdapter.fetchFundamentals(pos.symbol.uppercase())
                } catch (e: Exception) {
                    log.debug("Fundamentals unavailable for {}: {}", pos.symbol, e.message)
                    null
                }
                pos.copy(
                    currentPrice = qi?.priceInUserCurrency,
                    priceCurrency = currency,
                    fundamentals = fundamentals
                )
            },
            missingPrices = missing
        )
        return enriched
    }

    @Transactional
    fun confirm(request: MonthlyFlowConfirmRequest): MonthlyFlowConfirmResponse {
        require(request.budget > BigDecimal.ZERO) { "Budget must be greater than zero" }

        val negativeEntry = request.allocations.find { it.amount < BigDecimal.ZERO }
        if (negativeEntry != null) {
            throw IllegalArgumentException("Allocation amount cannot be negative for ${negativeEntry.symbol}")
        }

        val total = request.allocations.fold(BigDecimal.ZERO) { acc, e -> acc.add(e.amount) }
        if (total > request.budget) {
            throw IllegalArgumentException("Total allocated $total exceeds budget ${request.budget}")
        }

        val investable = request.allocations.filter { it.amount.compareTo(BigDecimal.ZERO) > 0 }
        val userCurrency = userProfileService.getProfile()?.preferredCurrency ?: "USD"

        var transactionsCreated = 0
        for (entry in investable) {
            val quote = marketDataService.getQuote(entry.symbol.uppercase())
            // Convert the user-entered amount (in their currency) back to the stock's native currency
            // to calculate how many shares were bought.
            val rate = marketDataService.getExchangeRate(userCurrency, quote.currency)
            val amountInStockCurrency = entry.amount * rate
            val quantity = amountInStockCurrency.divide(quote.price, 6, RoundingMode.HALF_UP)
            transactionService.addTransaction(
                TransactionRequest(
                    symbol = entry.symbol.uppercase(),
                    type = "BUY",
                    track = "LONG",
                    quantity = quantity,
                    pricePerUnit = quote.price,
                    executedAt = Instant.now()
                )
            )
            transactionsCreated++
        }

        return MonthlyFlowConfirmResponse(
            totalInvested = total.setScale(2, RoundingMode.HALF_UP),
            transactionsCreated = transactionsCreated
        )
    }
}
