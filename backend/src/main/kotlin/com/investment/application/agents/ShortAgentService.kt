package com.investment.application.agents

import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component

@Component
@Order(2)
class ShortAgentService : RecommendationSubAgent {
    override fun isActive(tracksEnabled: List<String>) =
        tracksEnabled.any { it.uppercase() == "SHORT" }

    override fun buildPromptSection(context: AgentContext): String =
        "\nSHORT TRACK ACTIVE: In addition to BUY recommendations, identify any significantly overweight or overvalued positions in the portfolio that could be short candidates. You may include SHORT recommendations (action='SHORT') when the case is compelling. Be conservative — only clear overvaluation or deteriorating fundamentals warrant a short."
}
