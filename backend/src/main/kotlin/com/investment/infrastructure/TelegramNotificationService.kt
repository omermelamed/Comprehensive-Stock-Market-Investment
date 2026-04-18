package com.investment.infrastructure

import com.investment.api.dto.AllocationEntry
import com.investment.api.dto.HoldingDashboardResponse
import jakarta.annotation.PostConstruct
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.MediaType
import org.springframework.stereotype.Service
import org.springframework.web.reactive.function.client.WebClient
import org.springframework.web.reactive.function.client.WebClientResponseException
import java.math.BigDecimal

@Service
class TelegramNotificationService(
    @Value("\${app.telegram.bot-token:}") private val botToken: String
) {

    private val log = LoggerFactory.getLogger(javaClass)

    private val webClient = WebClient.builder()
        .baseUrl("https://api.telegram.org")
        .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
        .build()

    private val ready: Boolean get() = botToken.isNotBlank()

    @PostConstruct
    fun logStatus() {
        if (ready) {
            log.info("Telegram bot configured (token ending …{})", botToken.takeLast(4))
        } else {
            log.warn("Telegram bot NOT configured — TELEGRAM_BOT_TOKEN is blank")
        }
    }

    fun sendMessage(chatId: String?, body: String): String? {
        if (!ready || chatId.isNullOrBlank()) return null

        return try {
            doSend(chatId, body, "Markdown")
        } catch (e: WebClientResponseException.BadRequest) {
            log.warn("Telegram sendMessage with Markdown failed (400), retrying without parse_mode: {}", e.responseBodyAsString)
            try {
                doSend(chatId, body, null)
            } catch (retry: Exception) {
                log.warn("Telegram sendMessage retry failed: {}", retry.message)
                null
            }
        } catch (e: Exception) {
            log.warn("Telegram sendMessage failed: {}", e.message)
            null
        }
    }

    private fun doSend(chatId: String, body: String, parseMode: String?): String? {
        val payload = mutableMapOf<String, Any>(
            "chat_id" to chatId,
            "text" to body
        )
        if (parseMode != null) payload["parse_mode"] = parseMode

        val response = webClient.post()
            .uri("/bot${botToken}/sendMessage")
            .bodyValue(payload)
            .retrieve()
            .bodyToMono(Map::class.java)
            .block()

        @Suppress("UNCHECKED_CAST")
        val result = response?.get("result") as? Map<String, Any>
        val messageId = result?.get("message_id")?.toString()
        log.info("Telegram message sent to chat {}", chatId)
        return messageId
    }

    fun sendInvestmentSummary(
        chatId: String?,
        totalInvested: BigDecimal,
        currency: String,
        allocations: List<AllocationEntry>,
        holdings: List<HoldingDashboardResponse> = emptyList()
    ) {
        if (!ready || chatId.isNullOrBlank()) return

        val buyLines = allocations
            .filter { it.amount > BigDecimal.ZERO }
            .sortedByDescending { it.amount }
            .joinToString("\n") { "  ${it.symbol}: $currency ${it.amount.setScale(2)}" }

        val sb = StringBuilder()
        sb.appendLine("*Monthly Investment Confirmed*")
        sb.appendLine()
        sb.appendLine("Total invested: *$currency ${totalInvested.setScale(2)}*")
        sb.appendLine()
        sb.appendLine("Purchases:")
        sb.appendLine(buyLines)

        if (holdings.isNotEmpty()) {
            val totalValue = holdings.sumOf { it.currentValue }
            val totalPnl = holdings.sumOf { it.pnlAbsolute }
            val pnlSign = if (totalPnl >= BigDecimal.ZERO) "+" else ""

            sb.appendLine()
            sb.appendLine("*Portfolio After Investment*")
            sb.appendLine("Total value: *$currency ${totalValue.setScale(2)}*  (${pnlSign}$currency ${totalPnl.setScale(2)})")
            sb.appendLine()

            holdings
                .sortedByDescending { it.currentValue }
                .forEach { h ->
                    val sign = if (h.pnlAbsolute >= BigDecimal.ZERO) "+" else ""
                    val pct = h.currentPercent.setScale(1)
                    sb.appendLine("  ${h.symbol}  $currency ${h.currentValue.setScale(2)}  (${pct}%)  ${sign}${h.pnlPercent.setScale(1)}%")
                }
        }

        try {
            sendMessage(chatId, sb.toString().trimEnd())
            log.info("Telegram investment summary sent to chat {}", chatId)
        } catch (e: Exception) {
            log.warn("Telegram notification failed: {}", e.message)
        }
    }

    fun discoverChatId(): String? {
        if (!ready) return null

        return try {
            val response = webClient.get()
                .uri("/bot${botToken}/getUpdates")
                .retrieve()
                .bodyToMono(Map::class.java)
                .block()

            @Suppress("UNCHECKED_CAST")
            val results = response?.get("result") as? List<Map<String, Any>> ?: return null

            results.asReversed()
                .firstNotNullOfOrNull { update ->
                    @Suppress("UNCHECKED_CAST")
                    val message = update["message"] as? Map<String, Any>
                    @Suppress("UNCHECKED_CAST")
                    val chat = message?.get("chat") as? Map<String, Any>
                    chat?.get("id")?.toString()
                }
        } catch (e: Exception) {
            log.warn("Telegram getUpdates failed: {}", e.message)
            null
        }
    }

    fun setWebhook(webhookUrl: String): Boolean {
        if (!ready) return false

        return try {
            val response = webClient.post()
                .uri("/bot${botToken}/setWebhook")
                .bodyValue(mapOf("url" to webhookUrl))
                .retrieve()
                .bodyToMono(Map::class.java)
                .block()

            val ok = response?.get("ok") as? Boolean ?: false
            if (ok) {
                log.info("Telegram webhook set to {}", webhookUrl)
            } else {
                log.warn("Telegram setWebhook returned ok=false: {}", response)
            }
            ok
        } catch (e: WebClientResponseException) {
            log.warn("Telegram setWebhook failed ({}): {}", e.statusCode, e.responseBodyAsString)
            false
        } catch (e: Exception) {
            log.warn("Telegram setWebhook failed: {}", e.message)
            false
        }
    }
}
