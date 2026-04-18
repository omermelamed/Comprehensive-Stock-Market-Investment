package com.investment.infrastructure

import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

@Component
class TelegramConfirmationExpiryJob(
    private val pendingRepository: TelegramPendingConfirmationRepository
) {

    private val log = LoggerFactory.getLogger(javaClass)

    @Scheduled(fixedRate = 60_000)
    fun expireStale() {
        try {
            pendingRepository.expireStale()
        } catch (e: Exception) {
            log.warn("Telegram confirmation expiry job failed: {}", e.message)
        }
    }
}
