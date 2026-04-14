package com.investment.infrastructure

import com.investment.application.WhatsAppScheduledMessageContentGenerator
import com.investment.application.WhatsAppScheduledMessageService
import com.investment.domain.NextSendAtCalculator
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.LocalTime
import java.time.ZoneId

@Component
class WhatsAppScheduledMessageJob(
    private val repository: WhatsAppScheduledMessageRepository,
    private val contentGenerator: WhatsAppScheduledMessageContentGenerator,
    private val notificationService: WhatsAppNotificationService,
    private val userProfileRepository: UserProfileRepository,
    private val scheduledMessageService: WhatsAppScheduledMessageService
) {

    private val log = LoggerFactory.getLogger(javaClass)

    @Scheduled(fixedRate = 60_000)
    fun run() {
        val profile = userProfileRepository.findProfile() ?: return
        if (profile.whatsappNumber.isNullOrBlank() || !profile.whatsappEnabled) return

        val due = repository.findDue()
        if (due.isEmpty()) return

        val tz = ZoneId.of(profile.timezone.ifBlank { "UTC" })

        for (schedule in due) {
            try {
                val content = contentGenerator.generate(schedule.messageType)
                val sid = notificationService.sendMessage(profile.whatsappNumber, content)

                val nextSendAt = NextSendAtCalculator.compute(
                    frequency    = schedule.frequency,
                    dayOfWeek    = schedule.dayOfWeek,
                    biweeklyWeek = schedule.biweeklyWeek,
                    dayOfMonth   = schedule.dayOfMonth,
                    sendTime     = LocalTime.parse(schedule.sendTime),
                    timezone     = tz
                )

                repository.updateAfterSend(schedule.id, nextSendAt)
                repository.logSend(schedule.id, "SENT", twilioSid = sid)

                log.info("Scheduled WhatsApp message sent: type={} id={} sid={}", schedule.messageType, schedule.id, sid)
            } catch (e: Exception) {
                log.error("Failed to send scheduled message id={}: {}", schedule.id, e.message)
                try {
                    repository.logSend(schedule.id, "FAILED", errorMessage = e.message)
                } catch (logEx: Exception) {
                    log.error("Failed to log send failure for id={}: {}", schedule.id, logEx.message)
                }
            }
        }
    }
}
