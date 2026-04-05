package com.investment.api.dto

import java.math.BigDecimal

data class RecommendationCard(
    val rank: Int,
    val symbol: String,
    val action: String,           // "BUY" always for now
    val source: String,           // "ALLOCATION_GAP", "WATCHLIST", "AI_SUGGESTION"
    val reason: String,
    val suggestedAmount: BigDecimal?,
    val confidence: String        // "HIGH", "MEDIUM", "LOW"
)
