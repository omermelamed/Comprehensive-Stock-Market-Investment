package com.investment.domain

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.investment.infrastructure.ai.ClaudeClient
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import java.math.BigDecimal
import java.math.RoundingMode

data class EvaluationResult(
    val riskLevel: String,
    val aiInferredScore: BigDecimal,
    val reasoning: String
)

@Component
class RiskProfileEvaluator(
    private val claudeClient: ClaudeClient
) {
    private val log = LoggerFactory.getLogger(javaClass)
    private val objectMapper = jacksonObjectMapper()

    private val validRiskLevels = setOf("CONSERVATIVE", "MODERATE", "AGGRESSIVE")

    private val systemPrompt = """
        You are a financial risk profiling assistant for a personal investment platform.
        Your task is to evaluate a user's risk profile based on their questionnaire answers,
        investment time horizon, and transaction history.

        You must respond ONLY with a valid JSON object in exactly this format, no other text:
        {"riskLevel":"MODERATE","aiInferredScore":0.55,"reasoning":"..."}

        Rules:
        - riskLevel must be one of: CONSERVATIVE, MODERATE, AGGRESSIVE
        - aiInferredScore must be a decimal between 0.000 and 1.000
          (0.000 = most conservative, 0.500 = moderate, 1.000 = most aggressive)
        - reasoning should be a concise 1-2 sentence explanation
    """.trimIndent()

    fun evaluate(
        questionnaireAnswers: Map<String, Any>,
        timeHorizonYears: Int,
        currentRiskLevel: String,
        totalTransactions: Int,
        buyCount: Int,
        sellCount: Int
    ): EvaluationResult {
        val userMessage = buildUserMessage(
            questionnaireAnswers, timeHorizonYears, currentRiskLevel,
            totalTransactions, buyCount, sellCount
        )

        val rawResponse = try {
            claudeClient.complete(systemPrompt, userMessage, maxTokens = 400)
        } catch (e: Exception) {
            log.warn("Claude evaluation call failed: {}", e.message)
            ""
        }

        return parseResponse(rawResponse, currentRiskLevel)
    }

    private fun buildUserMessage(
        questionnaireAnswers: Map<String, Any>,
        timeHorizonYears: Int,
        currentRiskLevel: String,
        totalTransactions: Int,
        buyCount: Int,
        sellCount: Int
    ): String {
        val answersText = questionnaireAnswers.entries.joinToString("\n") { (k, v) -> "  $k: $v" }
        return """
            Please evaluate this investor's risk profile:

            Current risk level: $currentRiskLevel
            Investment time horizon: $timeHorizonYears years

            Questionnaire answers:
            $answersText

            Transaction history:
            - Total transactions: $totalTransactions
            - Buy transactions: $buyCount
            - Sell transactions: $sellCount

            Based on these inputs, determine the appropriate risk level and score.
        """.trimIndent()
    }

    private fun parseResponse(rawResponse: String, currentRiskLevel: String): EvaluationResult {
        if (rawResponse.isBlank()) {
            return defaultResult(currentRiskLevel, "Evaluation unavailable")
        }

        return try {
            // Extract JSON from response in case there is extra whitespace or wrapping
            val jsonStart = rawResponse.indexOf('{')
            val jsonEnd = rawResponse.lastIndexOf('}')
            if (jsonStart == -1 || jsonEnd == -1) {
                return defaultResult(currentRiskLevel, "Evaluation unavailable")
            }
            val jsonText = rawResponse.substring(jsonStart, jsonEnd + 1)

            @Suppress("UNCHECKED_CAST")
            val parsed = objectMapper.readValue(jsonText, Map::class.java) as Map<String, Any>

            val rawLevel = parsed["riskLevel"]?.toString() ?: currentRiskLevel
            val riskLevel = if (rawLevel in validRiskLevels) rawLevel else "MODERATE"

            val rawScore = parsed["aiInferredScore"]?.toString()?.toBigDecimalOrNull()
                ?: BigDecimal("0.5")
            val aiInferredScore = rawScore
                .max(BigDecimal.ZERO)
                .min(BigDecimal.ONE)
                .setScale(3, RoundingMode.HALF_UP)

            val reasoning = parsed["reasoning"]?.toString() ?: "AI evaluation completed"

            EvaluationResult(
                riskLevel = riskLevel,
                aiInferredScore = aiInferredScore,
                reasoning = reasoning
            )
        } catch (e: Exception) {
            log.warn("Failed to parse Claude risk evaluation response: {}", e.message)
            defaultResult(currentRiskLevel, "Evaluation unavailable")
        }
    }

    private fun defaultResult(currentRiskLevel: String, reasoning: String): EvaluationResult {
        val level = if (currentRiskLevel in validRiskLevels) currentRiskLevel else "MODERATE"
        return EvaluationResult(
            riskLevel = level,
            aiInferredScore = BigDecimal("0.500"),
            reasoning = reasoning
        )
    }
}
