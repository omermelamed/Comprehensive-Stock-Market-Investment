package com.investment.application.agents

import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component

@Component
@Order(2)
class OptionsAgentService : RecommendationSubAgent {
    override fun isActive(tracksEnabled: List<String>) =
        tracksEnabled.any { it.uppercase() == "OPTIONS" }

    override fun buildPromptSection(context: AgentContext): String =
        "\nOPTIONS TRACK ACTIVE: For top long equity positions with significant holdings, consider whether a covered call overlay is appropriate for income generation. You may add COVERED_CALL recommendations (action='COVERED_CALL') alongside BUY recommendations. Do not suggest naked options or speculative strategies."
}
