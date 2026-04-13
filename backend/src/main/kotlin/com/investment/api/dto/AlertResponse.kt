package com.investment.api.dto

import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

data class AlertResponse(
    val id: UUID,
    val symbol: String,
    val condition: String,
    val thresholdPrice: BigDecimal,
    val note: String?,
    val source: String,
    val isActive: Boolean,
    val triggeredAt: Instant?,
    val dismissedAt: Instant?,
    val createdAt: Instant
)
