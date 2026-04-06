package com.investment.application.agents

import org.springframework.stereotype.Component

@Component
class OrchestratorAgentService(
    private val subAgents: List<RecommendationSubAgent>,
) {
    fun buildCombinedPrompt(context: AgentContext): String = buildString {
        subAgents
            .filter { it.isActive(context.tracksEnabled) }
            .forEach { agent ->
                append(agent.buildPromptSection(context))
                appendLine()
            }
        append("Generate a prioritized list of investment recommendations based on the above context.")
    }
}
