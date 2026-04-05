package com.investment.api.dto

import java.math.BigDecimal

data class MonthlyFlowConfirmResponse(
    val totalInvested: BigDecimal,
    val transactionsCreated: Int
)
