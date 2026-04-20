package com.investment.application

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.investment.api.dto.WatchlistItemResponse
import com.investment.infrastructure.WatchlistRepository
import com.investment.infrastructure.ai.ClaudeClient
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.time.LocalDate
import java.util.UUID

@Service
class WatchlistAnalysisService(
    private val watchlistRepository: WatchlistRepository,
    private val marketDataService: MarketDataService,
    private val userProfileService: UserProfileService,
    private val claudeClient: ClaudeClient,
    private val objectMapper: ObjectMapper
) {

    private val log = LoggerFactory.getLogger(javaClass)

    fun analyze(id: UUID): WatchlistItemResponse {
        val userId = RequestContext.get()
        val item = watchlistRepository.findById(userId, id)
            ?: throw NoSuchElementException("No watchlist item found with id $id")

        val currentPrice = try {
            marketDataService.getQuote(item.symbol).price.toPlainString()
        } catch (e: Exception) {
            log.warn("Could not fetch price for ${item.symbol}: ${e.message}")
            "unavailable"
        }

        val riskLevel = userProfileService.getProfile()?.riskLevel ?: "MODERATE"

        val system = """
            You are a disciplined investment analyst assistant for a personal portfolio app.
            Analyze the given stock/ETF symbol and return ONLY valid JSON matching this exact structure — no markdown, no explanation outside the JSON:
            {
              "signal": "GOOD_BUY_NOW" | "NOT_YET" | "WAIT_FOR_DIP",
              "summary": "<one sentence, max 120 chars>",
              "confidenceScore": <0-100>,
              "sources": ["<relevant URL 1>", "<relevant URL 2>"],
              "sections": {
                "valuation": "<2-3 sentences>",
                "momentum": "<2-3 sentences>",
                "financialHealth": "<2-3 sentences>",
                "growth": "<2-3 sentences>",
                "sentiment": "<2-3 sentences>"
              }
            }
            Signal definitions:
            - GOOD_BUY_NOW: compelling entry point at current price for this investor's profile
            - WAIT_FOR_DIP: fundamentally sound but currently overextended; wait for pullback
            - NOT_YET: weak fundamentals, unfavorable macro, or wrong fit for this portfolio
        """.trimIndent()

        val userMessage = buildString {
            appendLine("Symbol: ${item.symbol}")
            appendLine("Current price: $${currentPrice}")
            appendLine("Investor risk profile: $riskLevel")
            appendLine("Analysis date: ${LocalDate.now()}")
            appendLine()
            append("Provide a structured JSON analysis for this symbol as described.")
        }

        val rawResponse = try {
            claudeClient.complete(system, userMessage, maxTokens = 600)
        } catch (e: Exception) {
            log.warn("Claude analysis failed for ${item.symbol}: ${e.message}")
            ""
        }

        val (signal, summary, _, fullAnalysisJson) = parseAnalysisResponse(rawResponse)

        return watchlistRepository.saveAnalysis(
            userId = userId,
            id = id,
            signal = signal,
            signalSummary = summary,
            fullAnalysis = fullAnalysisJson
        )
    }

    private data class ParsedAnalysis(
        val signal: String,
        val summary: String,
        val confidenceScore: Int?,
        val fullAnalysisJson: String
    )

    private fun parseAnalysisResponse(raw: String): ParsedAnalysis {
        if (raw.isBlank()) {
            return fallback()
        }

        val cleaned = raw.trim()
            .removePrefix("```json")
            .removePrefix("```")
            .removeSuffix("```")
            .trim()

        return try {
            val parsed = objectMapper.readValue<Map<String, Any>>(cleaned)
            val signal = (parsed["signal"] as? String)?.uppercase()
                ?.takeIf { it in VALID_SIGNALS }
                ?: "NOT_YET"
            val summary = (parsed["summary"] as? String) ?: "Analysis unavailable"
            val confidenceScore = (parsed["confidenceScore"] as? Number)?.toInt()
            ParsedAnalysis(
                signal = signal,
                summary = summary,
                confidenceScore = confidenceScore,
                fullAnalysisJson = raw
            )
        } catch (e: Exception) {
            log.warn("Failed to parse Claude analysis response: ${e.message}")
            fallback()
        }
    }

    private fun fallback(): ParsedAnalysis {
        val fallbackJson = objectMapper.writeValueAsString(
            mapOf(
                "signal" to "NOT_YET",
                "summary" to "Analysis unavailable",
                "confidenceScore" to null,
                "sources" to emptyList<String>(),
                "sections" to mapOf(
                    "valuation" to "",
                    "momentum" to "",
                    "financialHealth" to "",
                    "growth" to "",
                    "sentiment" to ""
                )
            )
        )
        return ParsedAnalysis(
            signal = "NOT_YET",
            summary = "Analysis unavailable",
            confidenceScore = null,
            fullAnalysisJson = fallbackJson
        )
    }

    companion object {
        private val VALID_SIGNALS = setOf("GOOD_BUY_NOW", "NOT_YET", "WAIT_FOR_DIP")
    }
}
