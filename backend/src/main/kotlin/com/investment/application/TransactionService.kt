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
import java.math.BigDecimal
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
        val userId = RequestContext.get()
        val content = transactionRepository.findAll(userId, page, size)
        val totalElements = transactionRepository.count(userId)
        return mapOf(
            "content" to content,
            "totalElements" to totalElements,
            "page" to page,
            "size" to size
        )
    }

    fun getFeesSummary(): Map<String, Any> {
        val userId = RequestContext.get()
        val rows = transactionRepository.findAllOrderedByExecutedAtAsc(userId)

        val monthlyFees = rows
            .filter { it.fees > BigDecimal.ZERO }
            .groupBy {
                val date = it.executedAt.atZone(ZoneOffset.UTC).toLocalDate()
                "${date.year}-${date.monthValue.toString().padStart(2, '0')}"
            }
            .map { (month, txns) ->
                mapOf(
                    "month" to month,
                    "fees" to txns.fold(BigDecimal.ZERO) { acc, t -> acc + t.fees }
                )
            }
            .sortedBy { it["month"] as String }

        val symbolFees = rows
            .filter { it.fees > BigDecimal.ZERO }
            .groupBy { it.symbol }
            .map { (symbol, txns) ->
                mapOf(
                    "symbol" to symbol,
                    "fees" to txns.fold(BigDecimal.ZERO) { acc, t -> acc + t.fees }
                )
            }
            .sortedByDescending { it["fees"] as BigDecimal }

        val totalFees = rows.fold(BigDecimal.ZERO) { acc, t -> acc + t.fees }

        return mapOf(
            "totalFees" to totalFees,
            "monthlyFees" to monthlyFees,
            "symbolFees" to symbolFees
        )
    }

    @Transactional
    fun addTransaction(request: TransactionRequest): TransactionResponse {
        val userId = RequestContext.get()
        val currentHolding = holdingsProjectionRepository.findBySymbolAndTrack(
            userId = userId,
            symbol = request.symbol,
            track = request.track
        )

        when (val result = TransactionValidator.validate(request, currentHolding)) {
            is ValidationResult.Invalid -> throw IllegalArgumentException(result.message)
            is ValidationResult.Valid -> { /* proceed */ }
        }

        val saved = transactionRepository.insert(userId, request)

        schedulePostCommitSnapshotRegeneration(userId, request.executedAt)

        val totalCount = transactionRepository.count(userId)
        if (totalCount % 10L == 0L) {
            schedulePostCommitRiskEvaluation()
        }

        return saved
    }

    @Transactional
    fun updateTransaction(id: UUID, request: TransactionRequest): TransactionResponse {
        val userId = RequestContext.get()
        val oldExecutedAt = transactionRepository.findExecutedAtById(userId, id)
            ?: throw NoSuchElementException("No transaction found with id $id")

        val currentHolding = holdingsProjectionRepository.findBySymbolAndTrack(
            userId = userId,
            symbol = request.symbol,
            track = request.track
        )

        when (val result = TransactionValidator.validate(request, currentHolding)) {
            is ValidationResult.Invalid -> throw IllegalArgumentException(result.message)
            is ValidationResult.Valid -> { /* proceed */ }
        }

        val updated = transactionRepository.update(userId, id, request)

        val earliestDate = minOf(
            oldExecutedAt.atZone(ZoneOffset.UTC).toLocalDate(),
            request.executedAt.atZone(ZoneOffset.UTC).toLocalDate()
        )
        schedulePostCommitSnapshotRegeneration(userId, earliestDate.atStartOfDay(ZoneOffset.UTC).toInstant())

        return updated
    }

    @Transactional
    fun deleteTransaction(id: UUID) {
        val userId = RequestContext.get()
        val executedAt = transactionRepository.findExecutedAtById(userId, id)
        transactionRepository.delete(userId, id)
        if (executedAt != null) {
            schedulePostCommitSnapshotRegeneration(userId, executedAt)
        }
    }

    private fun schedulePostCommitSnapshotRegeneration(userId: UUID, executedAt: Instant) {
        val txDate = executedAt.atZone(ZoneOffset.UTC).toLocalDate()
        val today = LocalDate.now(clock)
        if (txDate.isAfter(today)) return

        TransactionSynchronizationManager.registerSynchronization(object : TransactionSynchronization {
            override fun afterCommit() {
                Thread {
                    try {
                        snapshotService.regenerateSnapshotsFrom(userId, txDate)
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
