package com.investment.api.dto

import java.math.BigDecimal

data class HoldingDashboardResponse(
    val symbol: String,
    val label: String?,
    val track: String,
    val quantity: BigDecimal,
    val avgBuyPrice: BigDecimal,      // in nativeCurrency
    val currentPrice: BigDecimal,     // in nativeCurrency
    val nativeCurrency: String,       // currency of avgBuyPrice / currentPrice (e.g. "USD")
    val currentValue: BigDecimal,     // in portfolio currency
    val costBasis: BigDecimal,        // in portfolio currency
    val pnlAbsolute: BigDecimal,      // in portfolio currency
    val pnlPercent: BigDecimal,
    val targetPercent: BigDecimal?,
    val currentPercent: BigDecimal,
    val allocationStatus: String,
    val drift: BigDecimal
)
