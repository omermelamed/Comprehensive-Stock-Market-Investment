package com.investment.api.dto

import java.math.BigDecimal

data class RiskEvaluationResponse(
    val riskLevel: String,
    val aiInferredScore: BigDecimal,
    val reasoning: String,
    val trigger: String
)
