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
import java.util.UUID

@Service
class TransactionService(
    private val transactionRepository: TransactionRepository,
    private val holdingsProjectionRepository: HoldingsProjectionRepository,
    @Lazy @Autowired private val riskProfileService: RiskProfileService
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

        val totalCount = transactionRepository.count()
        if (totalCount % 10L == 0L) {
            Thread {
                try {
                    riskProfileService.evaluate("AUTO")
                } catch (e: Exception) {
                    log.warn("Auto risk evaluation failed: {}", e.message)
                }
            }.also { it.isDaemon = true }.start()
        }

        return saved
    }

    @Transactional
    fun deleteTransaction(id: UUID) {
        transactionRepository.delete(id)
    }
}
