package com.investment.application

import com.investment.api.dto.ChatRequest
import com.investment.api.dto.ChatResponse
import com.investment.domain.MarketDataUnavailableException
import com.investment.infrastructure.AllocationRepository
import com.investment.infrastructure.HoldingsProjectionRepository
import com.investment.infrastructure.WatchlistRepository
import com.investment.infrastructure.ai.ClaudeClient
import com.investment.infrastructure.ai.ClaudeMessage
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.math.RoundingMode

@Service
class ChatService(
    private val userProfileService: UserProfileService,
    private val holdingsRepository: HoldingsProjectionRepository,
    private val allocationRepository: AllocationRepository,
    private val watchlistRepository: WatchlistRepository,
    private val marketDataService: MarketDataService,
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

        val profile = userProfileService.getProfile()
        val currency = profile?.preferredCurrency ?: "USD"

        appendLine("Monthly investment budget: ${profile?.monthlyInvestmentMax ?: "not configured"} $currency")
        appendLine("Risk profile: ${profile?.riskLevel ?: "not configured"}")
        appendLine("Active tracks: ${profile?.tracksEnabled?.joinToString(", ")?.ifEmpty { "LONG" } ?: "LONG"}")
        appendLine()

        val holdings = holdingsRepository.findAll().filter { it.track.uppercase() == "LONG" }
        if (holdings.isEmpty()) {
            appendLine("Holdings: none yet")
        } else {
            val prices = holdings.associate { h ->
                h.symbol.uppercase() to try {
                    val quote = marketDataService.getQuote(h.symbol)
                    val rate = marketDataService.getExchangeRate(quote.currency, currency)
                    (quote.price * rate).setScale(2, RoundingMode.HALF_UP)
                } catch (e: MarketDataUnavailableException) {
                    BigDecimal.ZERO
                } catch (e: Exception) {
                    BigDecimal.ZERO
                }
            }

            val portfolioTotal = holdings.sumOf { h ->
                (prices[h.symbol.uppercase()] ?: BigDecimal.ZERO) * h.netQuantity
            }.setScale(2, RoundingMode.HALF_UP)

            appendLine("Portfolio total: $portfolioTotal $currency")
            appendLine("Holdings:")
            holdings.forEach { h ->
                val price = prices[h.symbol.uppercase()] ?: BigDecimal.ZERO
                val value = (price * h.netQuantity).setScale(2, RoundingMode.HALF_UP)
                val pct = if (portfolioTotal.compareTo(BigDecimal.ZERO) != 0) {
                    value.divide(portfolioTotal, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal("100")).setScale(1, RoundingMode.HALF_UP)
                } else BigDecimal.ZERO
                appendLine("  ${h.symbol}: ${h.netQuantity} shares × $price $currency = $value $currency ($pct% of portfolio)")
            }
        }

        appendLine()
        val allocations = allocationRepository.findAll()
        if (allocations.isNotEmpty()) {
            appendLine("Target allocations:")
            allocations.forEach { a ->
                appendLine("  ${a.symbol}: ${a.targetPercentage}% target")
            }
        }

        appendLine()
        val watchlistSignals = watchlistRepository.findAll().filter { !it.signal.isNullOrBlank() }
        if (watchlistSignals.isNotEmpty()) {
            appendLine("Watchlist signals:")
            watchlistSignals.forEach { w ->
                appendLine("  ${w.symbol}: ${w.signal}")
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
