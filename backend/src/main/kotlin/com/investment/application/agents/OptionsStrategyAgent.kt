package com.investment.application.agents

import com.investment.api.dto.OptionsStrategyResponse
import com.investment.infrastructure.ai.ClaudeClient
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component

/**
 * Generates an options strategy suggestion for a held position.
 *
 * Conservative users: covered calls and protective puts only.
 * Moderate/Aggressive: may also suggest collars or cash-secured puts.
 * Never suggests naked calls or puts.
 */
@Component
class OptionsStrategyAgent(private val claudeClient: ClaudeClient) {

    private val log = LoggerFactory.getLogger(javaClass)

    fun generateStrategy(symbol: String, riskLevel: String): OptionsStrategyResponse {
        val allowedStrategies = allowedStrategiesFor(riskLevel)
        val prompt = buildPrompt(symbol, riskLevel, allowedStrategies)

        val rawText = try {
            claudeClient.complete(
                system = SYSTEM_PROMPT,
                userMessage = prompt,
                maxTokens = 600
            )
        } catch (e: Exception) {
            log.warn("Options strategy Claude call failed for {}: {}", symbol, e.message)
            ""
        }

        return parseResponse(symbol, rawText, allowedStrategies)
    }

    private fun allowedStrategiesFor(riskLevel: String): List<String> = when (riskLevel.uppercase()) {
        "CONSERVATIVE" -> listOf("Covered Call", "Protective Put")
        "MODERATE"     -> listOf("Covered Call", "Protective Put", "Cash-Secured Put", "Collar")
        else           -> listOf("Covered Call", "Protective Put", "Cash-Secured Put", "Collar", "Bull Call Spread")
    }

    private fun buildPrompt(symbol: String, riskLevel: String, allowed: List<String>): String = """
        The user holds shares of $symbol. They have a $riskLevel risk profile.

        Allowed strategies for this user: ${allowed.joinToString(", ")}.

        Suggest ONE appropriate options strategy from the allowed list.

        Respond in this exact format:
        STRATEGY: [strategy name]
        REASONING: [2-3 sentences explaining why this fits the position and risk level]
        OPTION_TYPE: [CALL or PUT]
        SUGGESTED_STRIKE: [e.g. "at-the-money" or "$150 (near current price)"]
        SUGGESTED_EXPIRY: [e.g. "30-45 days out" or "next monthly expiry"]
        ESTIMATED_PREMIUM: [e.g. "$2-3 per share"]
        MAX_LOSS: [e.g. "Limited to premium paid" or "Reduced cost basis"]
        BREAKEVEN: [e.g. "Current price minus premium collected"]
        EARNINGS_WARNING: [leave blank if no concern, or note if earnings are likely within expiry]

        Never suggest naked calls or puts. Never suggest strategies outside the allowed list.
    """.trimIndent()

    private fun parseResponse(
        symbol: String,
        rawText: String,
        allowed: List<String>
    ): OptionsStrategyResponse {
        if (rawText.isBlank()) {
            return OptionsStrategyResponse(
                symbol = symbol,
                strategyName = "Covered Call",
                reasoning = "A covered call overlay can generate income on existing holdings. No real-time Greeks available — please consult your broker for current premiums.",
                contractDetails = null,
                greeksUnavailable = true,
                earningsWarning = null
            )
        }

        fun extract(key: String): String? =
            Regex("$key:\\s*(.+)", RegexOption.IGNORE_CASE)
                .find(rawText)?.groupValues?.get(1)?.trim()?.ifBlank { null }

        val strategyName = extract("STRATEGY") ?: allowed.first()
        val reasoning = extract("REASONING") ?: rawText.take(300)
        val optionType = extract("OPTION_TYPE")?.uppercase()
        val suggestedStrike = extract("SUGGESTED_STRIKE")
        val suggestedExpiry = extract("SUGGESTED_EXPIRY")
        val estimatedPremium = extract("ESTIMATED_PREMIUM")
        val maxLoss = extract("MAX_LOSS")
        val breakeven = extract("BREAKEVEN")
        val earningsWarning = extract("EARNINGS_WARNING")

        val contractDetails = if (optionType != null && suggestedStrike != null) {
            com.investment.api.dto.OptionsContractDetails(
                optionType = optionType,
                suggestedStrike = suggestedStrike,
                suggestedExpiry = suggestedExpiry ?: "30-45 days",
                estimatedPremium = estimatedPremium ?: "Consult broker",
                maxLoss = maxLoss ?: "Varies",
                breakeven = breakeven ?: "Varies"
            )
        } else null

        return OptionsStrategyResponse(
            symbol = symbol,
            strategyName = strategyName,
            reasoning = reasoning,
            contractDetails = contractDetails,
            greeksUnavailable = true, // Polygon.io not configured
            earningsWarning = earningsWarning?.ifBlank { null }
        )
    }

    private companion object {
        private val SYSTEM_PROMPT = """
            You are an options strategy advisor for a personal investment portfolio platform.
            You must only suggest conservative, defined-risk options strategies.
            You must NEVER suggest naked calls, naked puts, or any undefined-risk strategy.
            Your suggestions are advisory only — the user makes all final decisions.
        """.trimIndent()
    }
}
