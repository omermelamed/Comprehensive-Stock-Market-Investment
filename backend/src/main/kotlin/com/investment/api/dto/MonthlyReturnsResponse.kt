package com.investment.api.dto

import java.math.BigDecimal

data class MonthlyReturnEntry(
    val month: String, // "2025-01"
    val startValue: BigDecimal,
    val endValue: BigDecimal,
    val returnAbsolute: BigDecimal,
    val returnPct: BigDecimal
)

data class MonthlyReturnsResponse(
    val range: String,
    val currency: String,
    val months: List<MonthlyReturnEntry>
)
