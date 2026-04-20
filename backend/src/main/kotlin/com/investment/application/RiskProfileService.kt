package com.investment.application

import com.investment.api.dto.RiskEvaluationResponse
import com.investment.api.dto.RiskHistoryEntryResponse
import com.investment.domain.RiskProfileEvaluator
import com.investment.infrastructure.RiskScoreHistoryRepository
import com.investment.infrastructure.TransactionRepository
import com.investment.infrastructure.UserProfileRepository
import org.springframework.stereotype.Service

@Service
class RiskProfileService(
    private val userProfileRepository: UserProfileRepository,
    private val riskScoreHistoryRepository: RiskScoreHistoryRepository,
    private val transactionRepository: TransactionRepository,
    private val riskProfileEvaluator: RiskProfileEvaluator
) {

    fun getHistory(): List<RiskHistoryEntryResponse> {
        val userId = RequestContext.get()
        return riskScoreHistoryRepository.findAllNewestFirst(userId)
    }

    fun evaluate(trigger: String): RiskEvaluationResponse {
        val userId = RequestContext.get()
        val profile = userProfileRepository.findByUserId(userId)
            ?: throw NoSuchElementException("No user profile found — cannot evaluate risk")

        val countByType = transactionRepository.countByType(userId)
        val totalTransactions = countByType.values.sum()
        val buyCount = countByType["BUY"] ?: 0
        val sellCount = countByType["SELL"] ?: 0

        val result = riskProfileEvaluator.evaluate(
            questionnaireAnswers = profile.questionnaireAnswers,
            timeHorizonYears = profile.timeHorizonYears,
            currentRiskLevel = profile.riskLevel,
            totalTransactions = totalTransactions,
            buyCount = buyCount,
            sellCount = sellCount
        )

        userProfileRepository.updateRiskScore(userId, result.riskLevel, result.aiInferredScore)

        riskScoreHistoryRepository.insert(
            userId = userId,
            riskLevel = result.riskLevel,
            aiInferredScore = result.aiInferredScore,
            reasoning = result.reasoning,
            trigger = trigger,
            transactionCountAtUpdate = totalTransactions
        )

        return RiskEvaluationResponse(
            riskLevel = result.riskLevel,
            aiInferredScore = result.aiInferredScore,
            reasoning = result.reasoning,
            trigger = trigger
        )
    }
}
