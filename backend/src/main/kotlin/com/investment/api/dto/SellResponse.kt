package com.investment.api.dto

import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

data class SellResponse(
    val transactionId: UUID,
    val symbol: String,
    val quantitySold: BigDecimal,
    val pricePerUnit: BigDecimal,
    val totalProceedsUsd: BigDecimal,
    val totalProceedsDisplay: BigDecimal,
    val pnlUsd: BigDecimal,
    val pnlDisplay: BigDecimal,
    val pnlPercent: BigDecimal,
    val remainingShares: BigDecimal,
    val positionClosed: Boolean,
    val isRetroactive: Boolean,
    val recalculationJobId: UUID?
)
