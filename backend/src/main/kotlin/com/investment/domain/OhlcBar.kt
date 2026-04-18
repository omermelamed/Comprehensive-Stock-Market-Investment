package com.investment.domain

import java.math.BigDecimal
import java.time.LocalDate

data class OhlcBar(
    val date: LocalDate,
    val open: BigDecimal,
    val high: BigDecimal,
    val low: BigDecimal,
    val close: BigDecimal,
    val volume: Long,
)
