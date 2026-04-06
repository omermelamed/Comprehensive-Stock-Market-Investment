package com.investment.api.dto

import java.math.BigDecimal

/**
 * Fundamental metrics for a single symbol, sourced from Alpha Vantage OVERVIEW.
 * All fields are nullable — Alpha Vantage may omit them for ETFs or non-US equities.
 * This data is advisory; it is provided by a deterministic API call, not invented by AI.
 */
data class FundamentalsData(
    val peRatio: BigDecimal?,
    val pegRatio: BigDecimal?,
    val eps: BigDecimal?,
    val dividendYield: BigDecimal?,
    val fiftyTwoWeekHigh: BigDecimal?,
    val fiftyTwoWeekLow: BigDecimal?,
    val marketCap: String?,          // raw string, e.g. "1234567890" — formatted by frontend
    val sector: String? = null,
    val country: String? = null
)
