package com.investment.api

import com.investment.application.SnapshotService
import com.investment.infrastructure.TransactionRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate

@RestController
@RequestMapping("/api/admin")
class AdminController(
    private val snapshotService: SnapshotService,
    private val transactionRepository: TransactionRepository,
) {

    /**
     * Deletes all snapshots and regenerates them from the earliest transaction date.
     * Uses historical closing prices for past dates and live quotes for today.
     */
    @PostMapping("/snapshots/regenerate")
    fun regenerateAllSnapshots(): ResponseEntity<Map<String, String>> {
        val earliest = transactionRepository.findEarliestTransactionDate()
            ?: return ResponseEntity.ok(mapOf("status" to "no_transactions"))

        Thread {
            snapshotService.regenerateSnapshotsFrom(earliest)
        }.also { it.isDaemon = true }.start()

        return ResponseEntity.ok(mapOf(
            "status" to "started",
            "from" to earliest.toString(),
            "to" to LocalDate.now().toString(),
        ))
    }
}
