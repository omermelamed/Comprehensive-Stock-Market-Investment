package com.investment.api.dto

import java.math.BigDecimal

data class PortfolioDataPoint(
    val date: String,
    val totalValue: BigDecimal,
    val dailyPnl: BigDecimal,
)

data class PortfolioHistoryResponse(
    val range: String,
    val points: List<PortfolioDataPoint>,
)
