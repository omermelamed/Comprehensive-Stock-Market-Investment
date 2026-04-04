package com.investment.api.dto

import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

data class TargetAllocationResponse(
    val id: UUID,
    val symbol: String,
    val assetType: String,
    val targetPercentage: BigDecimal,
    val label: String,
    val displayOrder: Int,
    val createdAt: Instant,
    val updatedAt: Instant
)
