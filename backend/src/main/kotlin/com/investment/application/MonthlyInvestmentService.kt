package com.investment.application

import com.investment.api.dto.AllocationEntry
import com.investment.api.dto.MonthlyFlowConfirmRequest
import com.investment.api.dto.MonthlyFlowConfirmResponse
import com.investment.api.dto.MonthlyFlowPreviewRequest
import com.investment.api.dto.MonthlyFlowPreviewResponse
import com.investment.api.dto.TransactionRequest
import com.investment.domain.MonthlyAllocationCalculator
import com.investment.infrastructure.AllocationRepository
import com.investment.infrastructure.HoldingsProjectionRepository
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
    private val transactionService: TransactionService
) {

    fun preview(request: MonthlyFlowPreviewRequest): MonthlyFlowPreviewResponse {
        require(request.budget > BigDecimal.ZERO) { "Budget must be greater than zero" }

        val holdings = holdingsRepository.findAll()
        val allocations = allocationRepository.findAll()

        val symbols = (holdings.map { it.symbol } + allocations.map { it.symbol })
            .map { it.uppercase() }
            .distinct()

        val missing = mutableListOf<String>()
        val prices = symbols.mapNotNull { symbol ->
            try {
                symbol to marketDataService.getQuote(symbol).price
            } catch (e: Exception) {
                missing.add(symbol)
                null
            }
        }.toMap()

        val result = MonthlyAllocationCalculator.compute(holdings, allocations, prices, request.budget)
        return result.copy(missingPrices = missing)
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
            throw IllegalArgumentException(
                "Total allocated $total exceeds budget ${request.budget}"
            )
        }

        val investable = request.allocations.filter { it.amount.compareTo(BigDecimal.ZERO) > 0 }

        var transactionsCreated = 0
        for (entry in investable) {
            val price = marketDataService.getQuote(entry.symbol.uppercase()).price
            val quantity = entry.amount.divide(price, 6, RoundingMode.HALF_UP)
            transactionService.addTransaction(
                TransactionRequest(
                    symbol = entry.symbol.uppercase(),
                    type = "BUY",
                    track = "LONG",
                    quantity = quantity,
                    pricePerUnit = price,
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
