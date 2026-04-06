package com.investment.api.dto

import java.math.BigDecimal

data class PositionCardResponse(
    val symbol: String,
    val label: String?,
    val targetPercent: BigDecimal,
    val currentPercent: BigDecimal,
    val currentValue: BigDecimal,
    val gapPercent: BigDecimal,
    val gapValue: BigDecimal,
    val suggestedAmount: BigDecimal,
    val suggestedShares: Int = 0,
    val status: String,
    val currentPrice: BigDecimal? = null,
    val priceCurrency: String? = null,
    val fundamentals: FundamentalsData? = null
)
