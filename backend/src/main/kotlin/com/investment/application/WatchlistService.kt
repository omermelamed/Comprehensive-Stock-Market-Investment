package com.investment.application

import com.investment.api.dto.AddWatchlistItemRequest
import com.investment.api.dto.TransactionRequest
import com.investment.api.dto.TransactionResponse
import com.investment.api.dto.WatchlistItemResponse
import com.investment.api.dto.WatchlistMetricsResponse
import com.investment.domain.MarketDataUnavailableException
import com.investment.infrastructure.WatchlistRepository
import com.investment.infrastructure.market.AlphaVantageAdapter
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Instant
import java.util.UUID

@Service
class WatchlistService(
    private val watchlistRepository: WatchlistRepository,
    private val marketDataService: MarketDataService,
    private val alphaVantageAdapter: AlphaVantageAdapter,
    private val transactionService: TransactionService
) {

    fun listItems(): List<WatchlistItemResponse> {
        return watchlistRepository.findAll()
    }

    fun addItem(request: AddWatchlistItemRequest): WatchlistItemResponse {
        val symbol = request.symbol.trim()
        require(symbol.isNotBlank()) { "Symbol must not be blank" }
        try {
            marketDataService.getQuote(symbol)
        } catch (e: MarketDataUnavailableException) {
            throw IllegalArgumentException("Symbol '$symbol' not found in market data")
        }
        return watchlistRepository.insert(symbol, request.assetType)
    }

    fun getMetrics(id: UUID): WatchlistMetricsResponse {
        val item = watchlistRepository.findById(id)
            ?: throw NoSuchElementException("No watchlist item found with id $id")
        val quote = marketDataService.getQuote(item.symbol)
        return WatchlistMetricsResponse(
            symbol = item.symbol,
            currentPrice = quote.price,
            currency = quote.currency,
            fundamentals = alphaVantageAdapter.fetchFundamentals(item.symbol)
        )
    }

    fun addToPortfolio(id: UUID, amount: BigDecimal): TransactionResponse {
        require(amount.compareTo(BigDecimal.ZERO) > 0) { "Amount must be positive" }
        val item = watchlistRepository.findById(id)
            ?: throw NoSuchElementException("No watchlist item found with id $id")
        val quote = marketDataService.getQuote(item.symbol)
        val quantity = amount.divide(quote.price, 6, RoundingMode.HALF_UP)
        return transactionService.addTransaction(
            TransactionRequest(
                symbol = item.symbol.uppercase(),
                type = "BUY",
                track = "LONG",
                quantity = quantity,
                pricePerUnit = quote.price,
                executedAt = Instant.now()
            )
        )
    }

    fun removeItem(id: UUID) {
        watchlistRepository.delete(id)
    }
}
