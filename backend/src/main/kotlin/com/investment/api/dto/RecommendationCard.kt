package com.investment.api.dto

import java.math.BigDecimal

data class RecommendationCard(
    val rank: Int,
    val symbol: String,
    val action: String,            // "BUY" | "SHORT" | "COVERED_CALL"
    val source: String,            // "ALLOCATION_GAP" | "WATCHLIST" | "AI_SUGGESTION"
    val reason: String,
    val suggestedAmount: BigDecimal?,
    val confidence: String,        // "HIGH" | "MEDIUM" | "LOW"
    val targetPrice: BigDecimal? = null,           // optional — Claude's 12-month price target
    val expectedReturnPercent: BigDecimal? = null,   // deterministic — from target vs current when both known
    val currentPrice: BigDecimal? = null,    // deterministic — from market data, set by service
    val timeHorizon: String? = null,         // advisory — Claude's suggested holding period
    val catalysts: List<String>? = null,     // advisory — Claude's 2-3 key reasons
    val fundamentals: FundamentalsData? = null, // deterministic — from Alpha Vantage OVERVIEW
    val sourceUrl: String? = null            // deterministic — Yahoo Finance quote page URL
)
