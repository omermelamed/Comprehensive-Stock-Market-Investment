package com.investment.api.dto

import java.math.BigDecimal

data class PortfolioSummaryResponse(
    val totalValue: BigDecimal,
    val totalCostBasis: BigDecimal,
    val totalPnlAbsolute: BigDecimal,
    val totalPnlPercent: BigDecimal,
    val currency: String,
    val holdingCount: Int,
    val allocationHealthScore: BigDecimal
)
