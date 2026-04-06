package com.investment.application.agents

import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component

@Component
@Order(2)
class CryptoAgentService : RecommendationSubAgent {
    override fun isActive(tracksEnabled: List<String>) =
        tracksEnabled.any { it.uppercase() == "CRYPTO" }

    override fun buildPromptSection(context: AgentContext): String =
        "\nCRYPTO TRACK ACTIVE: Treat any digital-asset or cryptocurrency watchlist items with crypto-appropriate context (market structure, trend, on-chain sentiment if known). Prioritize crypto watchlist items with GOOD_BUY_NOW signals."
}
