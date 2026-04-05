package com.investment.domain

import com.investment.api.dto.HoldingResponse
import com.investment.api.dto.MonthlyFlowPreviewResponse
import com.investment.api.dto.PositionCardResponse
import com.investment.api.dto.TargetAllocationResponse
import java.math.BigDecimal
import java.math.RoundingMode

object MonthlyAllocationCalculator {

    private val HUNDRED = BigDecimal("100")
    private val ZERO = BigDecimal.ZERO
    private val MONEY_SCALE = 2
    private val PCT_SCALE = 4
    private val ROUNDING = RoundingMode.HALF_UP

    fun compute(
        holdings: List<HoldingResponse>,
        allocations: List<TargetAllocationResponse>,
        prices: Map<String, BigDecimal>,
        budget: BigDecimal
    ): MonthlyFlowPreviewResponse {
        val longHoldings = holdings.filter { it.track.uppercase() == "LONG" }
        val holdingsBySymbol = longHoldings.associateBy { it.symbol.uppercase() }

        val portfolioTotal = longHoldings.sumOf { h ->
            val price = prices[h.symbol.uppercase()] ?: ZERO
            (h.netQuantity * price).setScale(MONEY_SCALE, ROUNDING)
        }.setScale(MONEY_SCALE, ROUNDING)

        data class GapModel(
            val alloc: TargetAllocationResponse,
            val currentValue: BigDecimal,
            val currentPercent: BigDecimal,
            val targetPercent: BigDecimal,
            val gapValue: BigDecimal,
            val gapPercent: BigDecimal
        )

        val gapModels = allocations.map { alloc ->
            val symbol = alloc.symbol.uppercase()
            val price = prices[symbol] ?: ZERO
            val holding = holdingsBySymbol[symbol]

            val currentValue = if (holding != null && price.compareTo(ZERO) != 0) {
                (holding.netQuantity * price).setScale(MONEY_SCALE, ROUNDING)
            } else {
                ZERO.setScale(MONEY_SCALE, ROUNDING)
            }

            val currentPercent = if (portfolioTotal.compareTo(ZERO) != 0) {
                currentValue.divide(portfolioTotal, 10, ROUNDING)
                    .multiply(HUNDRED)
                    .setScale(PCT_SCALE, ROUNDING)
            } else {
                ZERO.setScale(PCT_SCALE, ROUNDING)
            }

            val targetPercent = alloc.targetPercentage.setScale(PCT_SCALE, ROUNDING)

            val targetValue = portfolioTotal.multiply(targetPercent)
                .divide(HUNDRED, MONEY_SCALE, ROUNDING)

            val gapValue = targetValue.subtract(currentValue).setScale(MONEY_SCALE, ROUNDING)
            val gapPercent = targetPercent.subtract(currentPercent).setScale(PCT_SCALE, ROUNDING)

            GapModel(alloc, currentValue, currentPercent, targetPercent, gapValue, gapPercent)
        }

        val totalPositiveGap = gapModels
            .filter { it.gapValue.compareTo(ZERO) > 0 }
            .fold(ZERO) { acc, g -> acc.add(g.gapValue) }
            .setScale(MONEY_SCALE, ROUNDING)

        val positions = gapModels.map { gap ->
            val suggestedAmount = if (gap.gapValue.compareTo(ZERO) > 0 && totalPositiveGap.compareTo(ZERO) > 0) {
                budget.multiply(gap.gapValue)
                    .divide(totalPositiveGap, MONEY_SCALE, ROUNDING)
            } else {
                ZERO.setScale(MONEY_SCALE, ROUNDING)
            }

            val status = when {
                gap.gapValue.compareTo(ZERO) > 0 -> "UNDERWEIGHT"
                gap.gapValue.compareTo(ZERO) < 0 -> "OVERWEIGHT"
                else -> "ON_TARGET"
            }

            PositionCardResponse(
                symbol = gap.alloc.symbol,
                label = gap.alloc.label,
                targetPercent = gap.targetPercent,
                currentPercent = gap.currentPercent,
                currentValue = gap.currentValue,
                gapPercent = gap.gapPercent,
                gapValue = gap.gapValue,
                suggestedAmount = suggestedAmount,
                status = status
            )
        }

        return MonthlyFlowPreviewResponse(
            portfolioTotal = portfolioTotal,
            budget = budget.setScale(MONEY_SCALE, ROUNDING),
            positions = positions
        )
    }
}
