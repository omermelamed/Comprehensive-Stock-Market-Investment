package com.investment.application

import com.investment.api.dto.RecalculationStatusResponse
import com.investment.domain.MarketDataUnavailableException
import com.investment.infrastructure.RecalculationJobRepository
import com.investment.infrastructure.SnapshotRepository
import com.investment.infrastructure.TransactionRepository
import com.investment.infrastructure.TransactionLedgerRow
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.UUID

@Service
class RecalculationService(
    private val recalculationJobRepository: RecalculationJobRepository,
    private val snapshotRepository: SnapshotRepository,
    private val transactionRepository: TransactionRepository,
    private val marketDataService: MarketDataService,
    private val clock: Clock
) {
    private val log = LoggerFactory.getLogger(javaClass)

    fun getStatus(): RecalculationStatusResponse {
        val activeJob = recalculationJobRepository.findLatestActive()
        if (activeJob != null) {
            val progressPercent = if (activeJob.totalDays > 0) {
                (activeJob.daysCompleted.toDouble() / activeJob.totalDays * 100)
            } else 0.0

            val estimatedRemaining = if (activeJob.daysCompleted > 0 && activeJob.startedAt != null) {
                val elapsed = Instant.now(clock).epochSecond - activeJob.startedAt.epochSecond
                val perDay = elapsed.toDouble() / activeJob.daysCompleted
                val remaining = activeJob.totalDays - activeJob.daysCompleted
                (remaining * perDay).toInt()
            } else null

            return RecalculationStatusResponse(
                status = activeJob.status,
                jobId = activeJob.id,
                sellDate = activeJob.sellDate.toString(),
                daysCompleted = activeJob.daysCompleted,
                totalDays = activeJob.totalDays,
                progressPercent = progressPercent,
                estimatedSecondsRemaining = estimatedRemaining,
                queuedJobCount = recalculationJobRepository.countQueued() - 1
            )
        }

        val failedJob = recalculationJobRepository.findLatestFailed()
        if (failedJob != null) {
            return RecalculationStatusResponse(
                status = "FAILED",
                jobId = failedJob.id,
                sellDate = failedJob.sellDate.toString(),
                daysCompleted = failedJob.daysCompleted,
                totalDays = failedJob.totalDays,
                progressPercent = if (failedJob.totalDays > 0) {
                    (failedJob.daysCompleted.toDouble() / failedJob.totalDays * 100)
                } else 0.0,
                errorMessage = failedJob.errorMessage
            )
        }

        return RecalculationStatusResponse(status = "IDLE")
    }

    @Async
    fun startRecalculation(jobId: UUID) {
        val job = recalculationJobRepository.findById(jobId)
        if (job == null) {
            log.error("Recalculation job {} not found", jobId)
            return
        }

        recalculationJobRepository.markInProgress(jobId)
        log.info("Starting recalculation job {} from {} to {}", jobId, job.recalcFrom, job.recalcTo)

        try {
            val allTransactions = transactionRepository.findAllOrderedByExecutedAtAsc()
            val allSymbols = allTransactions.map { it.symbol.uppercase() }.distinct()

            val historicalBySymbol: Map<String, Map<LocalDate, BigDecimal>> = allSymbols.associateWith { symbol ->
                try {
                    marketDataService.getHistoricalPrices(symbol, job.recalcFrom, job.recalcTo)
                } catch (e: Exception) {
                    log.warn("No history for {}: {}", symbol, e.message)
                    emptyMap()
                }
            }

            val fallback = mutableMapOf<String, BigDecimal>()
            var date = job.recalcFrom
            var daysCompleted = 0

            snapshotRepository.deleteByDateRange(job.recalcFrom, job.recalcTo)

            val today = LocalDate.now(clock)

            while (!date.isAfter(job.recalcTo)) {
                val holdingsOnDate = computeHoldingsAsOf(allTransactions, date)

                if (holdingsOnDate.isNotEmpty()) {
                    val pricesForDate: Map<String, BigDecimal> = if (date.isBefore(today)) {
                        holdingsOnDate.associate { h ->
                            h.symbol to (historicalBySymbol[h.symbol]?.get(date)
                                ?: fallback[h.symbol]
                                ?: BigDecimal.ZERO)
                        }
                    } else {
                        holdingsOnDate.associate { h ->
                            val price = try {
                                marketDataService.getQuote(h.symbol).price
                            } catch (e: MarketDataUnavailableException) { BigDecimal.ZERO }
                            h.symbol to price
                        }
                    }

                    val totalValue = holdingsOnDate.sumOf { h ->
                        h.netQuantity * (pricesForDate[h.symbol] ?: BigDecimal.ZERO)
                    }

                    snapshotRepository.save(
                        date = date,
                        totalValue = totalValue,
                        dailyPnl = BigDecimal.ZERO,
                        source = "RETROACTIVE_RECALC"
                    )

                    pricesForDate.forEach { (sym, price) ->
                        if (price > BigDecimal.ZERO) fallback[sym] = price
                    }
                }

                daysCompleted++
                recalculationJobRepository.updateProgress(jobId, daysCompleted)
                date = date.plusDays(1)
            }

            recalculationJobRepository.markCompleted(jobId)
            log.info("Recalculation job {} completed: {} days recalculated", jobId, daysCompleted)
        } catch (e: Exception) {
            log.error("Recalculation job {} failed: {}", jobId, e.message, e)
            recalculationJobRepository.markFailed(jobId, e.message ?: "Unknown error")
        }
    }

    fun retryJob(jobId: UUID): RecalculationStatusResponse {
        val job = recalculationJobRepository.findById(jobId)
            ?: throw IllegalArgumentException("Recalculation job not found: $jobId")

        if (job.status != "FAILED") {
            throw IllegalStateException("Can only retry failed jobs. Current status: ${job.status}")
        }

        val today = LocalDate.now(clock)
        val lastCompleted = job.recalcFrom.plusDays(job.daysCompleted.toLong())
        val newJob = recalculationJobRepository.create(
            triggeredBy = job.triggeredBy,
            sellDate = job.sellDate,
            recalcFrom = lastCompleted,
            recalcTo = today
        )

        startRecalculation(newJob.id)

        return getStatus()
    }

    private data class HoldingState(
        val symbol: String,
        val track: String,
        val netQuantity: BigDecimal,
        val avgBuyPrice: BigDecimal,
        val totalCostBasis: BigDecimal
    )

    private fun computeHoldingsAsOf(
        allTransactions: List<TransactionLedgerRow>,
        date: LocalDate
    ): List<HoldingState> {
        val txsUpToDate = allTransactions.filter {
            it.executedAt.atZone(ZoneOffset.UTC).toLocalDate() <= date
        }

        return txsUpToDate.groupBy { it.symbol.uppercase() }.mapNotNull { (symbol, txs) ->
            var totalBuyCost = BigDecimal.ZERO
            var totalBuyQty = BigDecimal.ZERO
            var netQty = BigDecimal.ZERO
            var track = "LONG"

            for (tx in txs) {
                track = tx.track
                when (tx.type.uppercase()) {
                    "BUY" -> {
                        totalBuyCost += tx.quantity * tx.pricePerUnit
                        totalBuyQty += tx.quantity
                        netQty += tx.quantity
                    }
                    "SELL" -> netQty -= tx.quantity
                    "SHORT" -> netQty -= tx.quantity
                    "COVER" -> netQty += tx.quantity
                }
            }

            if (netQty.compareTo(BigDecimal.ZERO) <= 0) return@mapNotNull null

            val avgBuyPrice = if (totalBuyQty.compareTo(BigDecimal.ZERO) > 0)
                totalBuyCost.divide(totalBuyQty, 8, RoundingMode.HALF_UP)
            else BigDecimal.ZERO

            HoldingState(symbol, track, netQty, avgBuyPrice, totalBuyCost)
        }
    }
}
