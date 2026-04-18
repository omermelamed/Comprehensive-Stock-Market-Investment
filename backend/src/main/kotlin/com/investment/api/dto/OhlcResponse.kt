package com.investment.api.dto

import java.math.BigDecimal

data class OhlcBarResponse(
    val date: String,
    val open: BigDecimal,
    val high: BigDecimal,
    val low: BigDecimal,
    val close: BigDecimal,
    val volume: Long,
)

data class OhlcResponse(
    val symbol: String,
    val currency: String,
    val bars: List<OhlcBarResponse>,
)
