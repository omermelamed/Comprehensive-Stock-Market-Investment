package com.investment.domain

import java.math.BigDecimal

sealed class ClassifiedIntent {

    // Read intents
    object PortfolioStatus : ClassifiedIntent()
    object AllocationCheck : ClassifiedIntent()
    object TopPerformers : ClassifiedIntent()
    object WatchlistQuery : ClassifiedIntent()
    data class StockAnalysis(val symbol: String) : ClassifiedIntent()
    data class ConceptQuestion(val question: String) : ClassifiedIntent()

    // Write intents
    data class LogTransaction(
        val symbol: String,
        val type: String,
        val quantity: BigDecimal,
        val price: BigDecimal
    ) : ClassifiedIntent()

    data class StartMonthlyFlow(val amount: BigDecimal) : ClassifiedIntent()

    data class SetAlert(
        val symbol: String,
        val condition: String,
        val threshold: BigDecimal
    ) : ClassifiedIntent()

    data class AddWatchlist(val symbol: String) : ClassifiedIntent()
    data class RemoveWatchlist(val symbol: String) : ClassifiedIntent()

    // Unrecognised
    object Unknown : ClassifiedIntent()
}
