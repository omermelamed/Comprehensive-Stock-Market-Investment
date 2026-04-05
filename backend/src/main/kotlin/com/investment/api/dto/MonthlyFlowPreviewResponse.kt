package com.investment.api.dto

import java.math.BigDecimal

data class MonthlyFlowPreviewResponse(
    val portfolioTotal: BigDecimal,
    val budget: BigDecimal,
    val positions: List<PositionCardResponse>,
    val missingPrices: List<String> = emptyList()
)
