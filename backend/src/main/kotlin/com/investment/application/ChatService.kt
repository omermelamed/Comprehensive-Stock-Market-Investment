package com.investment.application

import com.investment.api.dto.ChatRequest
import com.investment.api.dto.ChatResponse
import com.investment.infrastructure.RecommendationCacheRepository
import com.investment.infrastructure.ai.ClaudeClient
import com.investment.infrastructure.ai.ClaudeMessage
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

@Service
class ChatService(
    private val sharedContextBuilder: SharedContextBuilder,
    private val recommendationCacheRepository: RecommendationCacheRepository,
    private val claudeClient: ClaudeClient
) {

    private val log = LoggerFactory.getLogger(javaClass)

    fun chat(request: ChatRequest): ChatResponse {
        val systemPrompt = buildSystemPrompt()

        val messages = request.history.map { turn ->
            ClaudeMessage(role = turn.role, content = turn.content)
        } + ClaudeMessage(role = "user", content = request.message)

        val reply = try {
            claudeClient.completeWithHistory(systemPrompt, messages, maxTokens = 800)
        } catch (e: Exception) {
            log.warn("Chat Claude call failed: {}", e.message)
            "I'm sorry, I couldn't process your request right now. Please try again."
        }

        return ChatResponse(reply = reply.ifBlank { "I couldn't generate a response. Please try again." })
    }

    private fun buildSystemPrompt(): String = buildString {
        appendLine(ASSISTANT_PREAMBLE)
        appendLine()
        appendLine("PORTFOLIO SNAPSHOT:")
        appendLine(sharedContextBuilder.build().contextString)

        val cached = recommendationCacheRepository.findFresh()
        if (cached != null && cached.recommendations.isNotEmpty()) {
            appendLine()
            appendLine("Latest AI recommendations:")
            cached.recommendations.forEach { r ->
                appendLine("  #${r.rank} ${r.symbol} — ${r.action}, ${r.confidence} confidence: ${r.reason}")
            }
        }
    }

    private companion object {
        private val ASSISTANT_PREAMBLE = """
            You are a portfolio assistant for a personal investment platform.
            You have access to the user's current portfolio data shown below.

            You can: explain holdings, analyze allocation gaps, compare positions, discuss investment concepts, and help the user think through decisions.
            You must NOT: create transactions, modify allocations, or make binding financial commitments on behalf of the user.
            If the user asks you to buy or sell, explain that they should use the Monthly Flow feature for guided investment suggestions or the Transactions page to record a trade.

            Keep answers concise and grounded in the data provided. Mark clearly any reasoning that goes beyond the provided data.
        """.trimIndent()
    }
}
