package com.investment.application

import com.investment.domain.ClassifiedIntent
import com.investment.domain.WhatsAppMessageFormatter
import com.investment.infrastructure.WhatsAppConversationRepository
import com.investment.infrastructure.WhatsAppNotificationService
import com.investment.infrastructure.WhatsAppPendingConfirmationRepository
import com.investment.infrastructure.WhatsAppSessionRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class WhatsAppBotService(
    private val sessionRepository: WhatsAppSessionRepository,
    private val conversationRepository: WhatsAppConversationRepository,
    private val pendingRepository: WhatsAppPendingConfirmationRepository,
    private val intentClassifier: WhatsAppIntentClassifier,
    private val confirmationService: WhatsAppConfirmationService,
    private val notificationService: WhatsAppNotificationService,
    private val contextBuilder: WhatsAppContextBuilder,
    private val readHandlers: WhatsAppReadHandlers,
    private val userProfileService: UserProfileService
) {

    private val log = LoggerFactory.getLogger(javaClass)

    fun handleInbound(from: String, body: String, twilioSid: String) {
        try {
            val profile = userProfileService.getProfile()
            if (profile != null && !profile.whatsappEnabled) {
                send(from, WhatsAppMessageFormatter.botDisabled(), UUID.randomUUID())
                return
            }

            val sessionId = sessionRepository.resolveSession(from)

            conversationRepository.logMessage(
                sessionId  = sessionId,
                phoneNumber = from,
                direction  = "INBOUND",
                body       = body,
                twilioSid  = twilioSid
            )

            // Check for an open confirmation first — user is responding yes/no
            val pending = pendingRepository.findOpenConfirmation(sessionId)
            if (pending != null) {
                val reply = confirmationService.handleReply(pending, body)
                send(from, reply, sessionId)
                return
            }

            // Classify intent and dispatch
            val history = conversationRepository.recentMessages(sessionId, 5)
            val context = contextBuilder.build()
            val intent  = intentClassifier.classify(body, history, context)

            val reply = dispatchIntent(intent, sessionId)
            send(from, reply, sessionId)

        } catch (e: Exception) {
            log.error("WhatsApp bot handleInbound failed for {}: {}", from, e.message, e)
            try {
                val fallbackSessionId = UUID.randomUUID()
                send(from, WhatsAppMessageFormatter.error("something went wrong. Please try again."), fallbackSessionId)
            } catch (sendEx: Exception) {
                log.error("Failed to send error message to {}: {}", from, sendEx.message)
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

            is ClassifiedIntent.Unknown          -> WhatsAppMessageFormatter.fallback()
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
