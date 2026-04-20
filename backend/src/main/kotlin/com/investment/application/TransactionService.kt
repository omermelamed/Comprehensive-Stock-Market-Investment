package com.investment.application

import com.investment.api.dto.TransactionRequest
import com.investment.api.dto.TransactionResponse
import com.investment.domain.TransactionValidator
import com.investment.domain.ValidationResult
import com.investment.infrastructure.HoldingsProjectionRepository
import com.investment.infrastructure.TransactionRepository
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Lazy
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionSynchronization
import org.springframework.transaction.support.TransactionSynchronizationManager
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.UUID

@Service
class TransactionService(
    private val transactionRepository: TransactionRepository,
    private val holdingsProjectionRepository: HoldingsProjectionRepository,
    @Lazy @Autowired private val riskProfileService: RiskProfileService,
    @Lazy @Autowired private val snapshotService: SnapshotService,
    private val clock: Clock
) {
    private val log = LoggerFactory.getLogger(javaClass)

    fun getTransactions(page: Int, size: Int): Map<String, Any> {
        val content = transactionRepository.findAll(page, size)
        val totalElements = transactionRepository.count()
        return mapOf(
            "content" to content,
            "totalElements" to totalElements,
            "page" to page,
            "size" to size
        )
    }

    @Transactional
    fun addTransaction(request: TransactionRequest): TransactionResponse {
        val currentHolding = holdingsProjectionRepository.findBySymbolAndTrack(
            symbol = request.symbol,
            track = request.track
        )

        when (val result = TransactionValidator.validate(request, currentHolding)) {
            is ValidationResult.Invalid -> throw IllegalArgumentException(result.message)
            is ValidationResult.Valid -> { /* proceed */ }
        }

        val saved = transactionRepository.insert(request)

        schedulePostCommitSnapshotRegeneration(request.executedAt)

        val totalCount = transactionRepository.count()
        if (totalCount % 10L == 0L) {
            schedulePostCommitRiskEvaluation()
        }

        return saved
    }

    @Transactional
    fun updateTransaction(id: UUID, request: TransactionRequest): TransactionResponse {
        val oldExecutedAt = transactionRepository.findExecutedAtById(id)
            ?: throw NoSuchElementException("No transaction found with id $id")

        val currentHolding = holdingsProjectionRepository.findBySymbolAndTrack(
            symbol = request.symbol,
            track = request.track
        )

        when (val result = TransactionValidator.validate(request, currentHolding)) {
            is ValidationResult.Invalid -> throw IllegalArgumentException(result.message)
            is ValidationResult.Valid -> { /* proceed */ }
        }

        val updated = transactionRepository.update(id, request)

        val earliestDate = minOf(
            oldExecutedAt.atZone(ZoneOffset.UTC).toLocalDate(),
            request.executedAt.atZone(ZoneOffset.UTC).toLocalDate()
        )
        schedulePostCommitSnapshotRegeneration(earliestDate.atStartOfDay(ZoneOffset.UTC).toInstant())

        return updated
    }

    @Transactional
    fun deleteTransaction(id: UUID) {
        val executedAt = transactionRepository.findExecutedAtById(id)
        transactionRepository.delete(id)
        if (executedAt != null) {
            schedulePostCommitSnapshotRegeneration(executedAt)
        }
    }

    /**
     * Registers a callback that fires after the current transaction commits,
     * so the regeneration thread sees the newly committed ledger state.
     */
    private fun schedulePostCommitSnapshotRegeneration(executedAt: Instant) {
        val txDate = executedAt.atZone(ZoneOffset.UTC).toLocalDate()
        val today = LocalDate.now(clock)
        if (txDate.isAfter(today)) return

        TransactionSynchronizationManager.registerSynchronization(object : TransactionSynchronization {
            override fun afterCommit() {
                Thread {
                    try {
                        snapshotService.regenerateSnapshotsFrom(txDate)
                    } catch (e: Exception) {
                        log.warn("Snapshot regeneration failed from {}: {}", txDate, e.message)
                    }
                }.also { it.isDaemon = true }.start()
            }
        })
    }

    private fun schedulePostCommitRiskEvaluation() {
        TransactionSynchronizationManager.registerSynchronization(object : TransactionSynchronization {
            override fun afterCommit() {
                Thread {
                    try {
                        riskProfileService.evaluate("AUTO")
                    } catch (e: Exception) {
                        log.warn("Auto risk evaluation failed: {}", e.message)
                    }
                }.also { it.isDaemon = true }.start()
            }
        })
    }
}
