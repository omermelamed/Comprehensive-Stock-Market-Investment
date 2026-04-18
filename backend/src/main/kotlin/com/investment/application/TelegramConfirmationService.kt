package com.investment.application

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.investment.api.dto.AddWatchlistItemRequest
import com.investment.api.dto.CreateAlertRequest
import com.investment.api.dto.MonthlyFlowConfirmRequest
import com.investment.api.dto.MonthlyFlowPreviewRequest
import com.investment.api.dto.ScheduledMessageRequest
import com.investment.api.dto.TransactionRequest
import com.investment.domain.ClassifiedIntent
import com.investment.domain.TelegramMessageFormatter
import com.investment.infrastructure.PendingConfirmation
import com.investment.infrastructure.TelegramPendingConfirmationRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

@Service
class TelegramConfirmationService(
    private val pendingRepository: TelegramPendingConfirmationRepository,
    private val transactionService: TransactionService,
    private val monthlyInvestmentService: MonthlyInvestmentService,
    private val alertService: AlertService,
    private val watchlistService: WatchlistService,
    private val scheduledMessageService: TelegramScheduledMessageService,
    private val objectMapper: ObjectMapper
) {

    private val log = LoggerFactory.getLogger(javaClass)

    private val YES_WORDS = setOf("yes", "y", "confirm", "ok", "sure", "yep", "yeah")
    private val NO_WORDS  = setOf("no", "n", "cancel", "stop", "nope", "nah")

    fun requestConfirmation(sessionId: UUID, intent: ClassifiedIntent): String {
        val (action, details, intentName, intentDataJson) = buildConfirmationPayload(intent)
            ?: return TelegramMessageFormatter.error("could not prepare confirmation for that action")

        pendingRepository.savePending(
            sessionId           = sessionId,
            intent              = intentName,
            intentDataJson      = intentDataJson,
            confirmationMessage = TelegramMessageFormatter.confirmationCard(action, details)
        )

        return TelegramMessageFormatter.confirmationCard(action, details)
    }

    fun handleReply(pending: PendingConfirmation, reply: String): String {
        val normalised = reply.trim().lowercase()
        return when {
            normalised in YES_WORDS -> {
                pendingRepository.resolve(pending.id, "CONFIRMED")
                executeIntent(pending)
            }
            normalised in NO_WORDS -> {
                pendingRepository.resolve(pending.id, "CANCELLED")
                TelegramMessageFormatter.cancelled()
            }
            else -> "Please reply *yes* to confirm or *no* to cancel."
        }
    }

    @Transactional
    private fun executeIntent(pending: PendingConfirmation): String {
        return try {
            val data: Map<String, Any> = objectMapper.readValue(pending.intentData)
            when (pending.intent) {
                "LOG_TRANSACTION" -> executeLogTransaction(data)
                "START_MONTHLY_FLOW" -> executeMonthlyFlow(data)
                "SET_ALERT" -> executeSetAlert(data)
                "ADD_WATCHLIST" -> executeAddWatchlist(data)
                "REMOVE_WATCHLIST" -> executeRemoveWatchlist(data)
                "SCHEDULE_MESSAGE" -> executeScheduleMessage(data)
                else -> TelegramMessageFormatter.error("unknown intent ${pending.intent}")
            }
        } catch (e: Exception) {
            log.error("Failed to execute confirmed intent {}: {}", pending.intent, e.message)
            TelegramMessageFormatter.error(e.message ?: "execution failed")
        }
    }

    private fun executeLogTransaction(data: Map<String, Any>): String {
        val symbol   = data["symbol"]?.toString() ?: return TelegramMessageFormatter.error("missing symbol")
        val type     = data["type"]?.toString() ?: return TelegramMessageFormatter.error("missing type")
        val quantity = parseBigDecimal(data["quantity"]) ?: return TelegramMessageFormatter.error("missing quantity")
        val price    = parseBigDecimal(data["price"]) ?: return TelegramMessageFormatter.error("missing price")

        transactionService.addTransaction(
            TransactionRequest(
                symbol       = symbol.uppercase(),
                type         = type.uppercase(),
                track        = "LONG",
                quantity     = quantity,
                pricePerUnit = price,
                executedAt   = Instant.now()
            )
        )
        return TelegramMessageFormatter.success("${type.uppercase()} $quantity $symbol at $price logged.")
    }

    private fun executeMonthlyFlow(data: Map<String, Any>): String {
        val amount = parseBigDecimal(data["amount"]) ?: return TelegramMessageFormatter.error("missing amount")

        val preview = monthlyInvestmentService.preview(MonthlyFlowPreviewRequest(budget = amount))
        val allocations = preview.positions
            .filter { it.suggestedAmount > BigDecimal.ZERO }
            .map { com.investment.api.dto.AllocationEntry(symbol = it.symbol, amount = it.suggestedAmount) }

        if (allocations.isEmpty()) {
            return "Portfolio is already on target. No transactions created."
        }

        monthlyInvestmentService.confirm(
            MonthlyFlowConfirmRequest(budget = amount, allocations = allocations)
        )

        val total = allocations.sumOf { it.amount }
        return TelegramMessageFormatter.success("Monthly investment of $total confirmed. ${allocations.size} transactions logged.")
    }

    private fun executeSetAlert(data: Map<String, Any>): String {
        val symbol    = data["symbol"]?.toString() ?: return TelegramMessageFormatter.error("missing symbol")
        val condition = data["condition"]?.toString() ?: return TelegramMessageFormatter.error("missing condition")
        val threshold = parseBigDecimal(data["threshold"]) ?: return TelegramMessageFormatter.error("missing threshold")

        alertService.createAlert(
            CreateAlertRequest(
                symbol         = symbol.uppercase(),
                condition      = condition.uppercase(),
                thresholdPrice = threshold
            )
        )
        return TelegramMessageFormatter.success("Alert set: ${symbol.uppercase()} $condition $threshold.")
    }

    private fun executeAddWatchlist(data: Map<String, Any>): String {
        val symbol = data["symbol"]?.toString() ?: return TelegramMessageFormatter.error("missing symbol")
        watchlistService.addItem(AddWatchlistItemRequest(symbol = symbol.uppercase(), assetType = "STOCK"))
        return TelegramMessageFormatter.success("${symbol.uppercase()} added to watchlist.")
    }

    private fun executeRemoveWatchlist(data: Map<String, Any>): String {
        val symbol = data["symbol"]?.toString() ?: return TelegramMessageFormatter.error("missing symbol")
        val items = watchlistService.listItems()
        val item = items.firstOrNull { it.symbol.equals(symbol, ignoreCase = true) }
            ?: return TelegramMessageFormatter.error("${symbol.uppercase()} not found in watchlist")
        watchlistService.removeItem(item.id)
        return TelegramMessageFormatter.success("${symbol.uppercase()} removed from watchlist.")
    }

    private fun executeScheduleMessage(data: Map<String, Any>): String {
        val messageType  = data["messageType"]?.toString() ?: return TelegramMessageFormatter.error("missing messageType")
        val frequency    = data["frequency"]?.toString() ?: return TelegramMessageFormatter.error("missing frequency")
        val sendTime     = data["sendTime"]?.toString() ?: return TelegramMessageFormatter.error("missing sendTime")
        val label        = data["label"]?.toString() ?: "Scheduled message"
        val dayOfWeek    = (data["dayOfWeek"] as? Number)?.toInt()
        val biweeklyWeek = (data["biweeklyWeek"] as? Number)?.toInt()
        val dayOfMonth   = (data["dayOfMonth"] as? Number)?.toInt()

        scheduledMessageService.create(
            ScheduledMessageRequest(
                messageType  = messageType,
                label        = label,
                frequency    = frequency,
                dayOfWeek    = dayOfWeek,
                biweeklyWeek = biweeklyWeek,
                dayOfMonth   = dayOfMonth,
                sendTime     = sendTime
            )
        )
        return TelegramMessageFormatter.success("Scheduled $messageType every $frequency at $sendTime.")
    }

    private data class ConfirmationPayload(
        val action: String,
        val details: List<Pair<String, String>>,
        val intentName: String,
        val intentDataJson: String
    )

    private fun buildConfirmationPayload(intent: ClassifiedIntent): ConfirmationPayload? {
        return when (intent) {
            is ClassifiedIntent.LogTransaction -> {
                val data = mapOf(
                    "symbol"   to intent.symbol,
                    "type"     to intent.type,
                    "quantity" to intent.quantity,
                    "price"    to intent.price
                )
                ConfirmationPayload(
                    action        = "${intent.type} ${intent.symbol}",
                    details       = listOf(
                        "Symbol"   to intent.symbol.uppercase(),
                        "Type"     to intent.type.uppercase(),
                        "Quantity" to intent.quantity.toPlainString(),
                        "Price"    to intent.price.toPlainString()
                    ),
                    intentName    = "LOG_TRANSACTION",
                    intentDataJson = objectMapper.writeValueAsString(data)
                )
            }
            is ClassifiedIntent.StartMonthlyFlow -> {
                val data = mapOf("amount" to intent.amount)
                ConfirmationPayload(
                    action        = "Monthly Investment",
                    details       = listOf("Budget" to intent.amount.toPlainString()),
                    intentName    = "START_MONTHLY_FLOW",
                    intentDataJson = objectMapper.writeValueAsString(data)
                )
            }
            is ClassifiedIntent.SetAlert -> {
                val data = mapOf(
                    "symbol"    to intent.symbol,
                    "condition" to intent.condition,
                    "threshold" to intent.threshold
                )
                ConfirmationPayload(
                    action        = "Set Alert",
                    details       = listOf(
                        "Symbol"    to intent.symbol.uppercase(),
                        "Condition" to intent.condition.uppercase(),
                        "Threshold" to intent.threshold.toPlainString()
                    ),
                    intentName    = "SET_ALERT",
                    intentDataJson = objectMapper.writeValueAsString(data)
                )
            }
            is ClassifiedIntent.AddWatchlist -> {
                val data = mapOf("symbol" to intent.symbol)
                ConfirmationPayload(
                    action        = "Add to Watchlist",
                    details       = listOf("Symbol" to intent.symbol.uppercase()),
                    intentName    = "ADD_WATCHLIST",
                    intentDataJson = objectMapper.writeValueAsString(data)
                )
            }
            is ClassifiedIntent.RemoveWatchlist -> {
                val data = mapOf("symbol" to intent.symbol)
                ConfirmationPayload(
                    action        = "Remove from Watchlist",
                    details       = listOf("Symbol" to intent.symbol.uppercase()),
                    intentName    = "REMOVE_WATCHLIST",
                    intentDataJson = objectMapper.writeValueAsString(data)
                )
            }
            is ClassifiedIntent.ScheduleMessage -> {
                val data = mapOf(
                    "messageType"  to intent.messageType,
                    "frequency"    to intent.frequency,
                    "dayOfWeek"    to intent.dayOfWeek,
                    "biweeklyWeek" to intent.biweeklyWeek,
                    "dayOfMonth"   to intent.dayOfMonth,
                    "sendTime"     to intent.sendTime,
                    "label"        to intent.label
                )
                val dayLabel = when (intent.dayOfWeek) {
                    0 -> "Sunday"; 1 -> "Monday"; 2 -> "Tuesday"
                    3 -> "Wednesday"; 4 -> "Thursday"; 5 -> "Friday"; 6 -> "Saturday"
                    else -> intent.dayOfMonth?.let { "Day $it" } ?: "—"
                }
                ConfirmationPayload(
                    action        = "Schedule Message",
                    details       = listOf(
                        "Type"      to intent.messageType,
                        "Frequency" to intent.frequency,
                        "Day"       to dayLabel,
                        "Time"      to intent.sendTime,
                        "Label"     to intent.label
                    ),
                    intentName    = "SCHEDULE_MESSAGE",
                    intentDataJson = objectMapper.writeValueAsString(data)
                )
            }
            else -> null
        }
    }

    private fun parseBigDecimal(value: Any?): BigDecimal? = when (value) {
        null      -> null
        is Number -> BigDecimal(value.toString())
        is String -> value.toBigDecimalOrNull()
        else      -> null
    }
}
