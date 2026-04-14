package com.investment.api.dto

import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

data class RiskHistoryEntryResponse(
    val id: UUID,
    val riskLevel: String,
    val aiInferredScore: BigDecimal?,
    val reasoning: String,
    val trigger: String,
    val transactionCountAtUpdate: Int,
    val createdAt: Instant
)
