package com.investment.api.dto

data class PositionSummaryResponse(
    val symbol: String,
    val summary: String,
    val sentiment: String = "NEUTRAL"  // "POSITIVE" | "NEUTRAL" | "CAUTIOUS"
)
