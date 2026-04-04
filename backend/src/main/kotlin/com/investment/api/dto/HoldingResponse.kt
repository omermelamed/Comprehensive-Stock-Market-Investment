package com.investment.api.dto

import java.math.BigDecimal
import java.time.Instant

data class HoldingResponse(
    val symbol: String,
    val track: String,
    val netQuantity: BigDecimal,
    val avgBuyPrice: BigDecimal,
    val totalCostBasis: BigDecimal,
    val transactionCount: Int,
    val firstBoughtAt: Instant,
    val lastTransactionAt: Instant
)
