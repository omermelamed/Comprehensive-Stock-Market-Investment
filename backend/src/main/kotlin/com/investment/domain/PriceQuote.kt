package com.investment.domain

import java.math.BigDecimal
import java.time.Instant

data class PriceQuote(
    val symbol: String,
    val price: BigDecimal,
    val currency: String,
    val timestamp: Instant,
    val source: String, // "YAHOO", "POLYGON", "ALPHAVANTAGE"
    val dayChangePercent: BigDecimal? = null,
)
