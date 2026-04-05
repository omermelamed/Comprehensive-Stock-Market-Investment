package com.investment.api.dto

import java.math.BigDecimal

data class MonthlyFlowConfirmRequest(
    val budget: BigDecimal,
    val allocations: List<AllocationEntry>
)

data class AllocationEntry(val symbol: String, val amount: BigDecimal)
