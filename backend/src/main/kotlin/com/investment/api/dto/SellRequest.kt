package com.investment.api.dto

import java.math.BigDecimal
import java.time.Instant

data class SellRequest(
    val symbol: String,
    val quantity: BigDecimal,
    val pricePerUnit: BigDecimal,
    val executedAt: Instant = Instant.now(),
    val notes: String? = null,
    val source: String = "APP"
)
