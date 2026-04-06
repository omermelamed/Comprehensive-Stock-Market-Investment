package com.investment.api.dto

import java.math.BigDecimal

data class CreateAlertRequest(
    val symbol: String,
    val condition: String,
    val thresholdPrice: BigDecimal,
    val note: String? = null
)
