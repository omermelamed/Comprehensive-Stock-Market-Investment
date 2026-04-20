package com.investment.application

import com.investment.api.dto.UserProfileRequest
import com.investment.api.dto.UserProfileResponse
import com.investment.domain.RiskLevelCalculator
import com.investment.infrastructure.UserProfileRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class UserProfileService(
    private val userProfileRepository: UserProfileRepository
) {

    fun getProfile(): UserProfileResponse? {
        val userId = RequestContext.get()
        return userProfileRepository.findByUserId(userId)
    }

    @Transactional
    fun createProfile(request: UserProfileRequest): UserProfileResponse {
        val userId = RequestContext.get()
        val riskLevel = RiskLevelCalculator.calculate(request.questionnaireAnswers, request.timeHorizonYears)
        return userProfileRepository.upsert(userId, request, riskLevel)
    }

    @Transactional
    fun updateProfile(request: UserProfileRequest): UserProfileResponse {
        val userId = RequestContext.get()
        val riskLevel = RiskLevelCalculator.calculate(request.questionnaireAnswers, request.timeHorizonYears)
        return userProfileRepository.update(userId, request, riskLevel)
    }

    @Transactional
    fun completeOnboarding(): UserProfileResponse {
        val userId = RequestContext.get()
        return userProfileRepository.setOnboardingCompleted(userId)
    }

    /** Used by controllers and bot handlers that have a live request context. */
    @Transactional
    fun linkTelegramChatIfNeeded(chatId: String) {
        val userId = RequestContext.get()
        val profile = userProfileRepository.findByUserId(userId) ?: return
        if (profile.telegramChatId == chatId) return
        userProfileRepository.linkTelegramChat(userId, chatId)
    }

    /** Used by callers that already resolved the userId (e.g. scheduler or system tasks). */
    @Transactional
    fun linkTelegramChatIfNeeded(userId: UUID, chatId: String) {
        val profile = userProfileRepository.findByUserId(userId) ?: return
        if (profile.telegramChatId == chatId) return
        userProfileRepository.linkTelegramChat(userId, chatId)
    }
}
