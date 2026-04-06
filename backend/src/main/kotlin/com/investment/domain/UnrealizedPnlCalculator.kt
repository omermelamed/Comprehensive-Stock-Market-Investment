package com.investment.domain

import java.math.BigDecimal
import java.math.RoundingMode

object UnrealizedPnlCalculator {

    data class PositionInput(
        val symbol: String,
        val label: String?,
        val currentValue: BigDecimal,
        val costBasis: BigDecimal
    )

    data class PositionPnl(
        val symbol: String,
        val label: String?,
        val currentValue: BigDecimal,
        val costBasis: BigDecimal,
        val pnlAbsolute: BigDecimal,
        val pnlPercent: BigDecimal,
        val portfolioWeightPct: BigDecimal
    )

    fun compute(positions: List<PositionInput>, totalPortfolioValue: BigDecimal): List<PositionPnl> {
        return positions.map { pos ->
            val pnl = pos.currentValue - pos.costBasis
            val pnlPct = if (pos.costBasis.compareTo(BigDecimal.ZERO) > 0) {
                pnl.divide(pos.costBasis, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal("100")).setScale(2, RoundingMode.HALF_UP)
            } else {
                BigDecimal.ZERO
            }
            val weight = if (totalPortfolioValue.compareTo(BigDecimal.ZERO) > 0) {
                pos.currentValue.divide(totalPortfolioValue, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal("100")).setScale(2, RoundingMode.HALF_UP)
            } else {
                BigDecimal.ZERO
            }
            PositionPnl(
                symbol = pos.symbol,
                label = pos.label,
                currentValue = pos.currentValue,
                costBasis = pos.costBasis,
                pnlAbsolute = pnl.setScale(2, RoundingMode.HALF_UP),
                pnlPercent = pnlPct,
                portfolioWeightPct = weight
            )
        }.sortedByDescending { it.currentValue }
    }
}
