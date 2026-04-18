package com.investment.api.dto

import java.math.BigDecimal

data class TransactionMarker(
    val date: String,
    val type: String,           // "BUY" or "SELL"
    val quantity: BigDecimal,
    val pricePerUnit: BigDecimal,
)

data class SymbolHistoryPoint(
    val date: String,
    val pnlValue: BigDecimal,   // P&L in portfolio currency
    val price: BigDecimal,       // closing price in native currency
    val avgCost: BigDecimal,     // avg cost in native currency
    val sharesHeld: BigDecimal,
    val pnlPercent: BigDecimal,
)

data class SymbolHistorySeries(
    val symbol: String,
    val label: String?,
    val points: List<SymbolHistoryPoint>,
    val periodReturnPct: BigDecimal,
    val transactions: List<TransactionMarker>,
    val nativeCurrency: String,
)

data class HoldingsHistoryResponse(
    val range: String,
    val series: List<SymbolHistorySeries>,
    val currency: String,
)
