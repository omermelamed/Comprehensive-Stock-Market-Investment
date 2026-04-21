package com.investment.api.dto

import java.math.BigDecimal
import java.time.Instant

data class TransactionRequest(
    val symbol: String,
    val type: String,
    val track: String,
    val quantity: BigDecimal,
    val pricePerUnit: BigDecimal,
    val executedAt: Instant = Instant.now(),
    val notes: String? = null,
    val fees: BigDecimal = BigDecimal.ZERO
)
