package com.investment.application.agents

import com.investment.domain.RecommendationGapCalculator
import java.math.BigDecimal

interface RecommendationSubAgent {
    fun isActive(tracksEnabled: List<String>): Boolean
    fun buildPromptSection(context: AgentContext): String
}

data class AgentContext(
    val totalPortfolioValue: BigDecimal,
    val currency: String,
    val monthlyBudget: BigDecimal,
    val riskLevel: String,
    val tracksEnabled: List<String>,
    val gaps: List<RecommendationGapCalculator.GapEntry>,
    val watchlistItems: List<Pair<String, String>>,
)
