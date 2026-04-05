package com.investment.api.dto

import java.math.BigDecimal

data class UserProfileRequest(
    val displayName: String,
    val preferredCurrency: String,
    val questionnaireAnswers: Map<String, Any>,
    val tracksEnabled: List<String>,
    val monthlyInvestmentMin: BigDecimal,
    val monthlyInvestmentMax: BigDecimal,
    val investmentGoal: String,
    val timeHorizonYears: Int,
    val theme: String = "LIGHT"
)
