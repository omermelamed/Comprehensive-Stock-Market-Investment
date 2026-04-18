package com.investment.application

import com.investment.domain.ClassifiedIntent
import com.investment.domain.TelegramMessageFormatter
import com.investment.infrastructure.TelegramConversationRepository
import com.investment.infrastructure.TelegramNotificationService
import com.investment.infrastructure.TelegramPendingConfirmationRepository
import com.investment.infrastructure.TelegramSessionRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class TelegramBotService(
    private val sessionRepository: TelegramSessionRepository,
    private val conversationRepository: TelegramConversationRepository,
    private val pendingRepository: TelegramPendingConfirmationRepository,
    private val intentClassifier: TelegramIntentClassifier,
    private val confirmationService: TelegramConfirmationService,
    private val notificationService: TelegramNotificationService,
    private val contextBuilder: TelegramContextBuilder,
    private val readHandlers: TelegramReadHandlers,
    private val userProfileService: UserProfileService
) {

    private val log = LoggerFactory.getLogger(javaClass)

    fun handleInbound(chatId: String, body: String, telegramMessageId: String) {
        try {
            userProfileService.linkTelegramChatIfNeeded(chatId)

            val profile = userProfileService.getProfile()
            if (profile != null && !profile.telegramEnabled) {
                send(chatId, TelegramMessageFormatter.botDisabled(), UUID.randomUUID())
                return
            }

            val sessionId = sessionRepository.resolveSession(chatId)

            conversationRepository.logMessage(
                sessionId  = sessionId,
                phoneNumber = chatId,
                direction  = "INBOUND",
                body       = body,
                telegramMessageId = telegramMessageId
            )

            val pending = pendingRepository.findOpenConfirmation(sessionId)
            if (pending != null) {
                val reply = confirmationService.handleReply(pending, body)
                send(chatId, reply, sessionId)
                return
            }

            val history = conversationRepository.recentMessages(sessionId, 5)
            val context = contextBuilder.build()
            val intent  = intentClassifier.classify(body, history, context)

            val reply = dispatchIntent(intent, sessionId)
            send(chatId, reply, sessionId)

        } catch (e: Exception) {
            log.error("Telegram bot handleInbound failed for {}: {}", chatId, e.message, e)
            try {
                val fallbackSessionId = UUID.randomUUID()
                send(chatId, TelegramMessageFormatter.error("something went wrong. Please try again."), fallbackSessionId)
            } catch (sendEx: Exception) {
                log.error("Failed to send error message to {}: {}", chatId, sendEx.message)
            }
        }
    }

    private fun dispatchIntent(intent: ClassifiedIntent, sessionId: UUID): String {
        return when (intent) {
            is ClassifiedIntent.PortfolioStatus  -> readHandlers.portfolioStatus()
            is ClassifiedIntent.AllocationCheck  -> readHandlers.allocationCheck()
            is ClassifiedIntent.TopPerformers    -> readHandlers.topPerformers()
            is ClassifiedIntent.WatchlistQuery   -> readHandlers.watchlistQuery()
            is ClassifiedIntent.StockAnalysis    -> readHandlers.stockAnalysis(intent.symbol)
            is ClassifiedIntent.ConceptQuestion  -> readHandlers.conceptQuestion(intent.question)

            is ClassifiedIntent.LogTransaction   -> confirmationService.requestConfirmation(sessionId, intent)
            is ClassifiedIntent.StartMonthlyFlow -> confirmationService.requestConfirmation(sessionId, intent)
            is ClassifiedIntent.SetAlert         -> confirmationService.requestConfirmation(sessionId, intent)
            is ClassifiedIntent.AddWatchlist     -> confirmationService.requestConfirmation(sessionId, intent)
            is ClassifiedIntent.RemoveWatchlist  -> confirmationService.requestConfirmation(sessionId, intent)
            is ClassifiedIntent.ScheduleMessage  -> confirmationService.requestConfirmation(sessionId, intent)

            is ClassifiedIntent.Unknown          -> TelegramMessageFormatter.fallback()
        }
    }

    private fun send(to: String, body: String, sessionId: UUID) {
        notificationService.sendMessage(to, body)
        conversationRepository.logMessage(
            sessionId   = sessionId,
            phoneNumber = to,
            direction   = "OUTBOUND",
            body        = body
        )
    }
}
