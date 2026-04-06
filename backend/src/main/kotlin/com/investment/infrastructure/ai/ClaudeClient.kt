package com.investment.infrastructure.ai

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import org.springframework.web.reactive.function.client.WebClient
import org.springframework.web.reactive.function.client.bodyToMono
import java.time.Duration

data class ClaudeMessage(val role: String, val content: String)

data class ClaudeRequest(
    val model: String,
    val max_tokens: Int,
    val system: String,
    val messages: List<ClaudeMessage>
)

data class ClaudeContentBlock(val type: String, val text: String)
data class ClaudeResponse(val content: List<ClaudeContentBlock>)

@Component
class ClaudeClient(
    @Value("\${app.anthropic.api-key:}") private val apiKey: String,
    @Value("\${app.anthropic.model:claude-sonnet-4-6}") private val model: String
) {
    private val webClient = WebClient.builder()
        .baseUrl("https://api.anthropic.com")
        .defaultHeader("x-api-key", apiKey)
        .defaultHeader("anthropic-version", "2023-06-01")
        .defaultHeader("content-type", "application/json")
        .build()

    fun complete(system: String, userMessage: String, maxTokens: Int = 150): String =
        completeWithHistory(system, listOf(ClaudeMessage(role = "user", content = userMessage)), maxTokens)

    fun completeWithHistory(system: String, messages: List<ClaudeMessage>, maxTokens: Int = 800): String {
        if (apiKey.isBlank()) return ""

        val response = webClient.post()
            .uri("/v1/messages")
            .bodyValue(
                ClaudeRequest(
                    model = model,
                    max_tokens = maxTokens,
                    system = system,
                    messages = messages
                )
            )
            .retrieve()
            .bodyToMono<ClaudeResponse>()
            .timeout(Duration.ofSeconds(30))
            .block() ?: return ""

        return response.content.firstOrNull()?.text?.trim() ?: ""
    }
}
