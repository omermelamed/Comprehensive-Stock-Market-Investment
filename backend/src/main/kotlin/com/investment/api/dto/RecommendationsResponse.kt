package com.investment.api.dto

import java.math.BigDecimal
import java.time.Instant

data class RecommendationsResponse(
    val recommendations: List<RecommendationCard>,
    val generatedAt: Instant,
    val expiresAt: Instant,
    val portfolioContext: PortfolioContextSummary
)

data class PortfolioContextSummary(
    val totalValue: BigDecimal,
    val currency: String,
    val monthlyBudget: BigDecimal,
    val riskLevel: String,
    val tracksEnabled: List<String>
)
