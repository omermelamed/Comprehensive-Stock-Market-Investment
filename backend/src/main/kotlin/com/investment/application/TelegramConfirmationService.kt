package com.investment.application

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.investment.api.dto.AddWatchlistItemRequest
import com.investment.api.dto.CreateAlertRequest
import com.investment.api.dto.MonthlyFlowConfirmRequest
import com.investment.api.dto.MonthlyFlowPreviewRequest
import com.investment.api.dto.ScheduledMessageRequest
import com.investment.api.dto.SellRequest
import com.investment.api.dto.TransactionRequest
import com.investment.domain.ClassifiedIntent
import com.investment.domain.TelegramMessageFormatter
import com.investment.infrastructure.HoldingsProjectionRepository
import com.investment.infrastructure.PendingConfirmation
import com.investment.infrastructure.TelegramPendingConfirmationRepository
import com.investment.infrastructure.TelegramNotificationService
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.UUID

@Service
class TelegramConfirmationService(
    private val pendingRepository: TelegramPendingConfirmationRepository,
    private val transactionService: TransactionService,
    private val sellService: SellService,
    private val monthlyInvestmentService: MonthlyInvestmentService,
    private val alertService: AlertService,
    private val watchlistService: WatchlistService,
    private val scheduledMessageService: TelegramScheduledMessageService,
    private val holdingsRepository: HoldingsProjectionRepository,
    private val marketDataService: MarketDataService,
    private val telegramNotificationService: TelegramNotificationService,
    private val userProfileService: UserProfileService,
    private val recalculationJobRepository: com.investment.infrastructure.RecalculationJobRepository,
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
                "SELL_HOLDING" -> executeSellHolding(data)
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

    private fun executeSellHolding(data: Map<String, Any>): String {
        val symbol   = data["symbol"]?.toString() ?: return TelegramMessageFormatter.error("missing symbol")
        val quantity = parseBigDecimal(data["quantity"]) ?: return TelegramMessageFormatter.error("missing quantity")
        val price    = parseBigDecimal(data["price"]) ?: return TelegramMessageFormatter.error("missing price")
        val dateStr  = data["date"]?.toString()

        val executedAt = if (dateStr != null) {
            LocalDate.parse(dateStr).atStartOfDay(ZoneOffset.UTC).toInstant()
        } else Instant.now()

        return try {
            val result = sellService.executeSell(SellRequest(
                symbol = symbol.uppercase(),
                quantity = quantity,
                pricePerUnit = price,
                executedAt = executedAt,
                source = "TELEGRAM"
            ))

            val profile = userProfileService.getProfile()
            val preferredCurrency = profile?.preferredCurrency ?: "USD"
            val pnlSign = if (result.pnlUsd >= BigDecimal.ZERO) "+" else ""
            val pnlEmoji = if (result.pnlUsd >= BigDecimal.ZERO) "\uD83D\uDCC8" else "\uD83D\uDCC9"

            val msg = buildString {
                appendLine("✅ Sold ${result.quantitySold} ${result.symbol}${if (dateStr != null) " on ${formatDateShort(dateStr)}" else ""} at \$${result.pricePerUnit}")
                appendLine("P&L: ${pnlSign}${preferredCurrency} ${result.pnlDisplay} (${pnlSign}${result.pnlPercent}%) $pnlEmoji")
                if (result.positionClosed) {
                    appendLine("Position fully closed.")
                } else {
                    appendLine("Remaining: ${result.remainingShares} shares")
                }
                if (result.isRetroactive) {
                    appendLine()
                    appendLine("\uD83D\uDD04 Recalculating history from ${formatDateShort(dateStr ?: "")}...")
                    appendLine("I'll notify you when it's complete.")
                }
            }

            if (result.isRetroactive && result.recalculationJobId != null) {
                scheduleRecalcNotification(result.recalculationJobId)
            }

            msg
        } catch (e: SellValidationException) {
            when (e.errorCode) {
                "INSUFFICIENT_SHARES" -> {
                    val held = e.sharesHeldAtDate?.toPlainString() ?: "?"
                    "You only held $held ${symbol.uppercase()}${if (dateStr != null) " on ${formatDateShort(dateStr)}" else ""}. Would you like to sell all $held? (yes / no)"
                }
                else -> TelegramMessageFormatter.error(e.message)
            }
        }
    }

    private fun formatDateShort(dateStr: String): String {
        return try {
            val date = LocalDate.parse(dateStr)
            "${date.month.name.take(3).lowercase().replaceFirstChar { it.uppercase() }} ${date.dayOfMonth}"
        } catch (_: Exception) { dateStr }
    }

    private fun scheduleRecalcNotification(jobId: UUID) {
        val profile = userProfileService.getProfile() ?: return
        val chatId = profile.telegramChatId ?: return
        if (!profile.telegramEnabled) return

        Thread {
            var attempts = 0
            while (attempts < 1800) {
                Thread.sleep(2000)
                attempts++
                try {
                    val job = recalculationJobRepository.findById(jobId)
                    if (job?.status == "COMPLETED") {
                        val dateStr = job.sellDate.toString()
                        telegramNotificationService.sendMessage(
                            chatId,
                            "✅ Historical data updated from ${formatDateShort(dateStr)}.\nYour portfolio charts and analytics are now accurate."
                        )
                        break
                    }
                    if (job?.status == "FAILED") {
                        telegramNotificationService.sendMessage(
                            chatId,
                            "❌ Historical data recalculation failed. Please retry from the app."
                        )
                        break
                    }
                } catch (_: Exception) {
                    break
                }
            }
        }.also { it.isDaemon = true }.start()
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
            is ClassifiedIntent.SellHolding -> {
                val symbol = intent.symbol.uppercase()
                val holding = holdingsRepository.findAll()
                    .firstOrNull { it.symbol.equals(symbol, ignoreCase = true) }
                val sharesHeld = holding?.netQuantity ?: BigDecimal.ZERO
                val quantity = when (intent.quantityMode) {
                    "ALL" -> sharesHeld
                    "HALF" -> sharesHeld.divide(BigDecimal(2), 8, RoundingMode.FLOOR)
                    "AMOUNT" -> {
                        val price = intent.price ?: try {
                            marketDataService.getQuote(symbol).price
                        } catch (_: Exception) { BigDecimal.ONE }
                        val fxRate = try {
                            val profile = userProfileService.getProfile()
                            val preferredCurrency = profile?.preferredCurrency ?: "USD"
                            if (preferredCurrency == "USD") BigDecimal.ONE
                            else marketDataService.getExchangeRate(preferredCurrency, "USD")
                        } catch (_: Exception) { BigDecimal.ONE }
                        val amountUsd = (intent.quantity ?: BigDecimal.ZERO) * fxRate
                        amountUsd.divide(price, 8, RoundingMode.FLOOR)
                    }
                    else -> intent.quantity ?: BigDecimal.ZERO
                }

                val price = intent.price ?: try {
                    marketDataService.getQuote(symbol).price
                } catch (_: Exception) { BigDecimal.ZERO }

                val preview = try {
                    sellService.getSellPreview(symbol, quantity, price, intent.date)
                } catch (_: Exception) { null }

                val dateLabel = intent.date?.let { formatDateShort(it) } ?: "Today"
                val pnlInfo = preview?.preview?.let { p ->
                    val sign = if (p.pnlUsd >= BigDecimal.ZERO) "+" else ""
                    val pnlEmoji = if (p.pnlUsd >= BigDecimal.ZERO) "\uD83D\uDCC8" else "\uD83D\uDCC9"
                    "P&L: ${sign}\$${p.pnlUsd} ($pnlEmoji ${sign}${p.pnlPercent}%)"
                } ?: ""

                val data = mapOf(
                    "symbol" to symbol,
                    "quantity" to quantity,
                    "price" to price,
                    "date" to intent.date
                )

                val isRetro = intent.date != null
                val details = mutableListOf(
                    "Symbol" to symbol,
                    "Quantity" to quantity.toPlainString(),
                    "Price" to "\$${price.toPlainString()}",
                    "Date" to dateLabel
                )
                if (pnlInfo.isNotBlank()) details.add("P&L" to pnlInfo)
                if (preview?.preview != null) {
                    details.add("Remaining" to "${preview.preview.remainingShares} shares")
                }
                if (isRetro) {
                    details.add("⚠️" to "Historical data will be recalculated from $dateLabel onward")
                }

                ConfirmationPayload(
                    action = "\uD83D\uDCC9 SELL $symbol",
                    details = details,
                    intentName = "SELL_HOLDING",
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
