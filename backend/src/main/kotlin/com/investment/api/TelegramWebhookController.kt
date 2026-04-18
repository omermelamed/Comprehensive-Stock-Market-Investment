package com.investment.api

import com.investment.application.TelegramBotService
import com.investment.application.UserProfileService
import com.investment.infrastructure.TelegramNotificationService
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/telegram")
class TelegramWebhookController(
    private val botService: TelegramBotService,
    private val notificationService: TelegramNotificationService,
    private val userProfileService: UserProfileService
) {

    private val log = LoggerFactory.getLogger(javaClass)

    /**
     * Telegram Bot API webhook. Receives Update JSON for every inbound message.
     * Returns 200 OK (empty body) so Telegram does not retry.
     */
    @PostMapping("/webhook")
    fun webhook(@RequestBody update: Map<String, Any>): ResponseEntity<Void> {
        try {
            @Suppress("UNCHECKED_CAST")
            val message = update["message"] as? Map<String, Any> ?: return ResponseEntity.ok().build()
            @Suppress("UNCHECKED_CAST")
            val chat = message["chat"] as? Map<String, Any> ?: return ResponseEntity.ok().build()

            val chatId = chat["id"]?.toString() ?: return ResponseEntity.ok().build()
            val text = message["text"]?.toString()?.trim() ?: return ResponseEntity.ok().build()
            val messageId = message["message_id"]?.toString() ?: "unknown"

            botService.handleInbound(chatId = chatId, body = text, telegramMessageId = messageId)
        } catch (e: Exception) {
            log.error("Telegram webhook processing failed: {}", e.message, e)
        }

        return ResponseEntity.ok().build()
    }

    /**
     * Calls getUpdates to discover the chat ID of the most recent user who messaged the bot.
     * The user must send /start to the bot first.
     */
    @GetMapping("/discover-chat")
    fun discoverChat(): ResponseEntity<Map<String, String>> {
        val chatId = notificationService.discoverChatId()
            ?: return ResponseEntity.status(404).body(mapOf(
                "error" to "No messages found. Send /start to your bot on Telegram first, then try again."
            ))
        userProfileService.linkTelegramChatIfNeeded(chatId)
        return ResponseEntity.ok(mapOf("chatId" to chatId))
    }

    /**
     * Sends a test Telegram message to the configured chat ID.
     */
    @PostMapping("/test")
    fun sendTestMessage(): ResponseEntity<Map<String, String>> {
        val profile = userProfileService.getProfile()
        val chatId = profile?.telegramChatId
        if (chatId.isNullOrBlank()) {
            return ResponseEntity.badRequest().body(mapOf(
                "error" to "No Telegram chat ID configured. Save your profile with a chat ID first."
            ))
        }
        val msgId = notificationService.sendMessage(chatId, "Hello from your Portfolio app! Your Telegram bot is working.")
        if (msgId == null) {
            return ResponseEntity.status(502).body(mapOf(
                "error" to "Failed to send message. Check that TELEGRAM_BOT_TOKEN is set."
            ))
        }
        return ResponseEntity.ok(mapOf("status" to "sent", "to" to chatId, "messageId" to msgId))
    }

    /**
     * Registers the webhook URL with Telegram Bot API.
     */
    @PostMapping("/set-webhook")
    fun setWebhook(@RequestBody body: Map<String, String>): ResponseEntity<Map<String, Any>> {
        val url = body["url"]
        if (url.isNullOrBlank()) {
            return ResponseEntity.badRequest().body(mapOf("error" to "url is required"))
        }
        val ok = notificationService.setWebhook(url)
        return if (ok) {
            ResponseEntity.ok(mapOf("status" to "ok", "webhookUrl" to url))
        } else {
            ResponseEntity.status(502).body(mapOf("error" to "Failed to set webhook with Telegram API"))
        }
    }
}
