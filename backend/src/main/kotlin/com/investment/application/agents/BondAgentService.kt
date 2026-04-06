package com.investment.application.agents

import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component

@Component
@Order(2)
class BondAgentService : RecommendationSubAgent {
    override fun isActive(tracksEnabled: List<String>) =
        tracksEnabled.any { it.uppercase() == "BOND" }

    override fun buildPromptSection(context: AgentContext): String =
        "\nBOND TRACK ACTIVE: For any bond or fixed income positions and watchlist items, evaluate yield, duration risk, and credit quality. Consider current interest rate environment when recommending bond positions."
}
