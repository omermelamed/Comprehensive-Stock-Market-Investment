package com.investment.api.dto

import java.math.BigDecimal

data class SellPreviewResponse(
    val symbol: String,
    val label: String?,
    val sharesHeld: BigDecimal,
    val avgCostPerShare: BigDecimal,
    val currentPriceUsd: BigDecimal,
    val currentPriceDisplay: BigDecimal,
    val preferredCurrency: String,
    val exchangeRate: BigDecimal,
    val currentValueDisplay: BigDecimal,
    val nativeCurrency: String,
    val isRetroactive: Boolean,
    val retroactiveDate: String?,
    val historicalPriceUsd: BigDecimal?,
    val sharesHeldAtDate: BigDecimal?,
    val avgCostAtDate: BigDecimal?,
    val preview: SellPreviewCalculation?
)

data class SellPreviewCalculation(
    val quantity: BigDecimal,
    val sellPriceUsd: BigDecimal,
    val totalProceedsUsd: BigDecimal,
    val totalProceedsDisplay: BigDecimal,
    val avgCostAtDate: BigDecimal,
    val pnlUsd: BigDecimal,
    val pnlDisplay: BigDecimal,
    val pnlPercent: BigDecimal,
    val remainingShares: BigDecimal,
    val positionCloses: Boolean
)
