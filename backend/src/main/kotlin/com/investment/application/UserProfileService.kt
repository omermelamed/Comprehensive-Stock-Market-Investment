package com.investment.application

import com.investment.api.dto.UserProfileRequest
import com.investment.api.dto.UserProfileResponse
import com.investment.domain.RiskLevelCalculator
import com.investment.infrastructure.UserProfileRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class UserProfileService(
    private val userProfileRepository: UserProfileRepository
) {

    fun getProfile(): UserProfileResponse? {
        return userProfileRepository.findOne()
    }

    @Transactional
    fun createProfile(request: UserProfileRequest): UserProfileResponse {
        val riskLevel = RiskLevelCalculator.calculate(request.questionnaireAnswers, request.timeHorizonYears)
        return userProfileRepository.upsert(request, riskLevel)
    }

    @Transactional
    fun updateProfile(request: UserProfileRequest): UserProfileResponse {
        val riskLevel = RiskLevelCalculator.calculate(request.questionnaireAnswers, request.timeHorizonYears)
        return userProfileRepository.update(request, riskLevel)
    }

    @Transactional
    fun completeOnboarding(): UserProfileResponse {
        return userProfileRepository.setOnboardingCompleted()
    }
}
