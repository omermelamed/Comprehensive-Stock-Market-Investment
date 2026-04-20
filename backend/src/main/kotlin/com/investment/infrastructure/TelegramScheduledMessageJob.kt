package com.investment.infrastructure

import com.investment.application.RequestContext
import com.investment.application.TelegramScheduledMessageContentGenerator
import com.investment.application.TelegramScheduledMessageService
import com.investment.domain.NextSendAtCalculator
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.LocalTime
import java.time.ZoneId

@Component
class TelegramScheduledMessageJob(
    private val repository: TelegramScheduledMessageRepository,
    private val contentGenerator: TelegramScheduledMessageContentGenerator,
    private val notificationService: TelegramNotificationService,
    private val userProfileRepository: UserProfileRepository,
    private val userRepository: UserRepository,
    private val scheduledMessageService: TelegramScheduledMessageService
) {

    private val log = LoggerFactory.getLogger(javaClass)

    @Scheduled(fixedRate = 60_000)
    fun run() {
        for (userId in userRepository.findAllIds()) {
            runForUser(userId)
        }
    }

    private fun runForUser(userId: java.util.UUID) {
        RequestContext.set(userId)
        try {
            val profile = userProfileRepository.findProfile(userId) ?: return
            if (profile.telegramChatId.isNullOrBlank() || !profile.telegramEnabled) return

            val due = repository.findDue(userId)
            if (due.isEmpty()) return

            val tz = ZoneId.of(profile.timezone.ifBlank { "UTC" })

            for (schedule in due) {
                try {
                    val content = contentGenerator.generate(schedule.messageType, userId)
                    val msgId = notificationService.sendMessage(profile.telegramChatId, content)

                    val nextSendAt = NextSendAtCalculator.compute(
                        frequency    = schedule.frequency,
                        dayOfWeek    = schedule.dayOfWeek,
                        biweeklyWeek = schedule.biweeklyWeek,
                        dayOfMonth   = schedule.dayOfMonth,
                        sendTime     = LocalTime.parse(schedule.sendTime),
                        timezone     = tz
                    )

                    repository.updateAfterSend(schedule.id, nextSendAt)
                    repository.logSend(schedule.id, "SENT", telegramMessageId = msgId)

                    log.info("Scheduled Telegram message sent: type={} id={} msgId={}", schedule.messageType, schedule.id, msgId)
                } catch (e: Exception) {
                    log.error("Failed to send scheduled message id={}: {}", schedule.id, e.message)
                    try {
                        repository.logSend(schedule.id, "FAILED", errorMessage = e.message)
                    } catch (logEx: Exception) {
                        log.error("Failed to log send failure for id={}: {}", schedule.id, logEx.message)
                    }
                }
            }
        } finally {
            RequestContext.clear()
        }
    }
}
