package com.investment.application.agents

import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component

@Component
@Order(2)
class ReitAgentService : RecommendationSubAgent {
    override fun isActive(tracksEnabled: List<String>) =
        tracksEnabled.any { it.uppercase() == "REIT" }

    override fun buildPromptSection(context: AgentContext): String =
        "\nREIT TRACK ACTIVE: For any REIT positions or watchlist items, evaluate dividend yield, FFO quality, property sector exposure, and interest rate sensitivity. Recommend REITs only when yield is attractive relative to risk."
}
