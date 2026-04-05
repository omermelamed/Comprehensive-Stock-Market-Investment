package com.investment.api.dto

import java.math.BigDecimal

data class HoldingDashboardResponse(
    val symbol: String,
    val label: String?,
    val track: String,
    val quantity: BigDecimal,
    val avgBuyPrice: BigDecimal,
    val currentPrice: BigDecimal,
    val currentValue: BigDecimal,
    val costBasis: BigDecimal,
    val pnlAbsolute: BigDecimal,
    val pnlPercent: BigDecimal,
    val targetPercent: BigDecimal?,
    val currentPercent: BigDecimal,
    val allocationStatus: String,
    val drift: BigDecimal
)
