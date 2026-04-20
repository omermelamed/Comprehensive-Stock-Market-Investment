package com.investment.application

import com.investment.infrastructure.SnapshotRepository
import com.investment.infrastructure.TransactionRepository
import com.investment.infrastructure.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.time.LocalDate
import java.util.UUID

@Service
class CatchUpService(
    private val transactionRepository: TransactionRepository,
    private val snapshotRepository: SnapshotRepository,
    private val snapshotService: SnapshotService,
    private val userRepository: UserRepository
) {

    private val log = LoggerFactory.getLogger(javaClass)

    fun runCatchUp() {
        for (userId in userRepository.findAllIds()) {
            runCatchUpForUser(userId)
        }
    }

    private fun runCatchUpForUser(userId: UUID) {
        val earliest = transactionRepository.findEarliestTransactionDate(userId)
        if (earliest == null) {
            log.debug("No transactions found for user {} — skipping catch-up", userId)
            return
        }

        // Catch-up covers from earliest transaction date through yesterday.
        // Today's snapshot is the scheduled job's responsibility.
        // Note: catch-up prices reflect today's market prices, not historical prices,
        // because we don't have a paid historical data API.
        val yesterday = LocalDate.now().minusDays(1)
        if (earliest.isAfter(yesterday)) {
            log.debug("Earliest transaction date {} is not before yesterday for user {} — nothing to catch up", earliest, userId)
            return
        }

        val missingDates = generateSequence(earliest) { it.plusDays(1) }
            .takeWhile { !it.isAfter(yesterday) }
            .filter { !snapshotRepository.existsForDate(userId, it) }
            .toList()

        if (missingDates.isEmpty()) {
            log.debug("No missing snapshots found for user {} in catch-up range {} to {}", userId, earliest, yesterday)
            return
        }

        log.info(
            "Catch-up user {}: {} missing snapshot(s) found between {} and {}. Prices reflect today's market data.",
            userId, missingDates.size, missingDates.first(), missingDates.last()
        )

        var created = 0
        for (date in missingDates) {
            snapshotService.createSnapshotForDate(userId, date, "CATCHUP")
            created++
        }

        log.info("Catch-up complete for user {}: {} snapshot(s) created", userId, created)
    }
}
