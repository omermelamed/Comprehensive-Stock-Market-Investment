package com.investment.application

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.investment.domain.ClassifiedIntent
import com.investment.infrastructure.WhatsAppConversationRecord
import com.investment.infrastructure.ai.ClaudeClient
import com.investment.infrastructure.ai.ClaudeMessage
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.math.BigDecimal

@Service
class WhatsAppIntentClassifier(
    private val claudeClient: ClaudeClient,
    private val objectMapper: ObjectMapper
) {

    private val log = LoggerFactory.getLogger(javaClass)

    fun classify(
        userMessage: String,
        recentHistory: List<WhatsAppConversationRecord>,
        portfolioContext: String
    ): ClassifiedIntent {
        val historyText = recentHistory
            .reversed()
            .joinToString("\n") { "[${it.direction}] ${it.messageBody}" }

        val systemPrompt = """
            You are an intent classifier for a personal investment WhatsApp bot.

            PORTFOLIO CONTEXT:
            $portfolioContext

            RECENT CONVERSATION HISTORY (oldest first):
            $historyText

            Classify the user's message into exactly ONE intent and respond ONLY with a JSON object.
            No markdown, no explanation, no extra text — only the JSON.

            Supported intents and their JSON shape:

            Read intents (respond immediately without confirmation):
            {"intent": "PORTFOLIO_STATUS"}
            {"intent": "ALLOCATION_CHECK"}
            {"intent": "TOP_PERFORMERS"}
            {"intent": "WATCHLIST_QUERY"}
            {"intent": "STOCK_ANALYSIS", "symbol": "VOO"}
            {"intent": "CONCEPT_QUESTION", "question": "What is P/E ratio?"}

            Write intents (require user confirmation before executing):
            {"intent": "LOG_TRANSACTION", "symbol": "VOO", "type": "BUY", "quantity": 5, "price": 221.40}
            {"intent": "START_MONTHLY_FLOW", "amount": 2000}
            {"intent": "SET_ALERT", "symbol": "AAPL", "condition": "ABOVE", "threshold": 200.00}
            {"intent": "ADD_WATCHLIST", "symbol": "MSFT"}
            {"intent": "REMOVE_WATCHLIST", "symbol": "MSFT"}

            Unknown:
            {"intent": "UNKNOWN"}

            Rules:
            - type must be BUY, SELL, SHORT, or COVER
            - condition must be ABOVE or BELOW
            - all numeric fields must be numbers (not strings)
            - if the user mentions buying or selling a stock with quantity and price, use LOG_TRANSACTION
            - if the user asks about their portfolio value or holdings, use PORTFOLIO_STATUS
            - if the user asks to invest their monthly budget, use START_MONTHLY_FLOW
        """.trimIndent()

        return try {
            val json = claudeClient.completeWithHistory(
                system = systemPrompt,
                messages = listOf(ClaudeMessage(role = "user", content = userMessage)),
                maxTokens = 200
            )
            parseIntent(json)
        } catch (e: Exception) {
            log.warn("Intent classification failed: {}", e.message)
            ClassifiedIntent.Unknown
        }
    }

    private fun parseIntent(json: String): ClassifiedIntent {
        return try {
            val cleaned = json.trim().removePrefix("```json").removePrefix("```").removeSuffix("```").trim()
            val map: Map<String, Any> = objectMapper.readValue(cleaned)

            when (map["intent"]?.toString()?.uppercase()) {
                "PORTFOLIO_STATUS"  -> ClassifiedIntent.PortfolioStatus
                "ALLOCATION_CHECK"  -> ClassifiedIntent.AllocationCheck
                "TOP_PERFORMERS"    -> ClassifiedIntent.TopPerformers
                "WATCHLIST_QUERY"   -> ClassifiedIntent.WatchlistQuery
                "STOCK_ANALYSIS"    -> ClassifiedIntent.StockAnalysis(
                    symbol = map["symbol"]?.toString() ?: return ClassifiedIntent.Unknown
                )
                "CONCEPT_QUESTION"  -> ClassifiedIntent.ConceptQuestion(
                    question = map["question"]?.toString() ?: return ClassifiedIntent.Unknown
                )
                "LOG_TRANSACTION"   -> ClassifiedIntent.LogTransaction(
                    symbol   = map["symbol"]?.toString() ?: return ClassifiedIntent.Unknown,
                    type     = map["type"]?.toString()?.uppercase() ?: return ClassifiedIntent.Unknown,
                    quantity = parseBigDecimal(map["quantity"]) ?: return ClassifiedIntent.Unknown,
                    price    = parseBigDecimal(map["price"]) ?: return ClassifiedIntent.Unknown
                )
                "START_MONTHLY_FLOW" -> ClassifiedIntent.StartMonthlyFlow(
                    amount = parseBigDecimal(map["amount"]) ?: return ClassifiedIntent.Unknown
                )
                "SET_ALERT"         -> ClassifiedIntent.SetAlert(
                    symbol    = map["symbol"]?.toString() ?: return ClassifiedIntent.Unknown,
                    condition = map["condition"]?.toString()?.uppercase() ?: return ClassifiedIntent.Unknown,
                    threshold = parseBigDecimal(map["threshold"]) ?: return ClassifiedIntent.Unknown
                )
                "ADD_WATCHLIST"     -> ClassifiedIntent.AddWatchlist(
                    symbol = map["symbol"]?.toString() ?: return ClassifiedIntent.Unknown
                )
                "REMOVE_WATCHLIST"  -> ClassifiedIntent.RemoveWatchlist(
                    symbol = map["symbol"]?.toString() ?: return ClassifiedIntent.Unknown
                )
                else                -> ClassifiedIntent.Unknown
            }
        } catch (e: Exception) {
            log.warn("Failed to parse intent JSON '{}': {}", json, e.message)
            ClassifiedIntent.Unknown
        }
    }

    private fun parseBigDecimal(value: Any?): BigDecimal? {
        return when (value) {
            null              -> null
            is Number         -> BigDecimal(value.toString())
            is String         -> value.toBigDecimalOrNull()
            else              -> null
        }
    }
}
