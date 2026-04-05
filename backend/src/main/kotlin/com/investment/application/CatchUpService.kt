package com.investment.application

import com.investment.infrastructure.SnapshotRepository
import com.investment.infrastructure.TransactionRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.time.LocalDate

@Service
class CatchUpService(
    private val transactionRepository: TransactionRepository,
    private val snapshotRepository: SnapshotRepository,
    private val snapshotService: SnapshotService
) {

    private val log = LoggerFactory.getLogger(javaClass)

    fun runCatchUp() {
        val earliest = transactionRepository.findEarliestTransactionDate()
        if (earliest == null) {
            log.debug("No transactions found — skipping catch-up")
            return
        }

        // Catch-up covers from earliest transaction date through yesterday.
        // Today's snapshot is the scheduled job's responsibility.
        // Note: catch-up prices reflect today's market prices, not historical prices,
        // because this is a local single-user app without a paid historical data API.
        val yesterday = LocalDate.now().minusDays(1)
        if (earliest.isAfter(yesterday)) {
            log.debug("Earliest transaction date {} is not before yesterday — nothing to catch up", earliest)
            return
        }

        val missingDates = generateSequence(earliest) { it.plusDays(1) }
            .takeWhile { !it.isAfter(yesterday) }
            .filter { !snapshotRepository.existsForDate(it) }
            .toList()

        if (missingDates.isEmpty()) {
            log.debug("No missing snapshots found in catch-up range {} to {}", earliest, yesterday)
            return
        }

        log.info(
            "Catch-up: {} missing snapshot(s) found between {} and {}. Prices reflect today's market data.",
            missingDates.size, missingDates.first(), missingDates.last()
        )

        var created = 0
        for (date in missingDates) {
            snapshotService.createSnapshotForDate(date, "CATCHUP")
            created++
        }

        log.info("Catch-up complete: {} snapshot(s) created", created)
    }
}
