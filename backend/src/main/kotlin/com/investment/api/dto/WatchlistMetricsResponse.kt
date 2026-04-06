package com.investment.api.dto

import java.math.BigDecimal

data class WatchlistMetricsResponse(
    val symbol: String,
    val currentPrice: BigDecimal?,
    val currency: String,
    val fundamentals: FundamentalsData?
)
