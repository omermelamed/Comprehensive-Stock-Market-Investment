package com.investment.api.dto

import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

data class UserProfileResponse(
    val id: UUID,
    val displayName: String,
    val preferredCurrency: String,
    val riskLevel: String,
    val timeHorizonYears: Int,
    val monthlyInvestmentMin: BigDecimal,
    val monthlyInvestmentMax: BigDecimal,
    val investmentGoal: String,
    val tracksEnabled: List<String>,
    val questionnaireAnswers: Map<String, Any>,
    val aiInferredScore: BigDecimal?,
    val theme: String,
    val onboardingCompleted: Boolean,
    val whatsappNumber: String?,
    val whatsappEnabled: Boolean = false,
    val createdAt: Instant,
    val lastUpdated: Instant
)
