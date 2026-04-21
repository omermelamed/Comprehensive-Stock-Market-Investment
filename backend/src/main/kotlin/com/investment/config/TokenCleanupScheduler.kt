package com.investment.config

import com.investment.infrastructure.VerificationTokenRepository
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

@Component
class TokenCleanupScheduler(
    private val tokenRepository: VerificationTokenRepository
) {

    private val log = LoggerFactory.getLogger(TokenCleanupScheduler::class.java)

    @Scheduled(cron = "0 0 3 * * *")
    fun cleanupExpiredTokens() {
        tokenRepository.deleteExpired()
        log.info("Cleaned up expired verification tokens")
    }
}
