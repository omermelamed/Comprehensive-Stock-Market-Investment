package com.investment.api.dto

import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

data class TransactionResponse(
    val id: UUID,
    val symbol: String,
    val type: String,
    val track: String,
    val quantity: BigDecimal,
    val pricePerUnit: BigDecimal,
    val totalValue: BigDecimal,
    val fees: BigDecimal,
    val notes: String?,
    val executedAt: Instant,
    val createdAt: Instant
)
