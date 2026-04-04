package com.investment.api.dto

import java.math.BigDecimal

data class TargetAllocationRequest(
    val symbol: String,
    val assetType: String,
    val targetPercentage: BigDecimal,
    val label: String,
    val displayOrder: Int = 0
)
