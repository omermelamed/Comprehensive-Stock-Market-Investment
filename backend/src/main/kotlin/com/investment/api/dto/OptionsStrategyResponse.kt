package com.investment.api.dto

data class OptionsStrategyResponse(
    val symbol: String,
    val strategyName: String,
    val reasoning: String,
    val contractDetails: OptionsContractDetails?,
    val greeksUnavailable: Boolean,
    val earningsWarning: String?
)

data class OptionsContractDetails(
    val optionType: String,          // CALL | PUT
    val suggestedStrike: String,
    val suggestedExpiry: String,
    val estimatedPremium: String,
    val maxLoss: String,
    val breakeven: String
)
