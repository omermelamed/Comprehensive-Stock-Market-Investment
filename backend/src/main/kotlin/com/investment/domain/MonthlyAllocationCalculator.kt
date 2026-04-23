package com.investment.domain

import com.investment.api.dto.HoldingResponse
import com.investment.api.dto.MonthlyFlowPreviewResponse
import com.investment.api.dto.PositionCardResponse
import com.investment.api.dto.TargetAllocationResponse
import java.math.BigDecimal
import java.math.RoundingMode

object MonthlyAllocationCalculator {

    private val LONG_TRACKS = setOf("LONG", "LONG_EQUITY")
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
        val longHoldings = holdings.filter { it.track.uppercase() in LONG_TRACKS }
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

        val emptyPortfolio = portfolioTotal.compareTo(ZERO) == 0

        val gapModels = allocations.map { alloc ->
            val symbol = alloc.symbol.uppercase()
            val price = prices[symbol] ?: ZERO
            val holding = holdingsBySymbol[symbol]

            val currentValue = if (holding != null && price.compareTo(ZERO) != 0) {
                (holding.netQuantity * price).setScale(MONEY_SCALE, ROUNDING)
            } else {
                ZERO.setScale(MONEY_SCALE, ROUNDING)
            }

            val currentPercent = if (!emptyPortfolio) {
                currentValue.divide(portfolioTotal, 10, ROUNDING)
                    .multiply(HUNDRED)
                    .setScale(PCT_SCALE, ROUNDING)
            } else {
                ZERO.setScale(PCT_SCALE, ROUNDING)
            }

            val targetPercent = alloc.targetPercentage.setScale(PCT_SCALE, ROUNDING)

            val targetValue = if (emptyPortfolio) {
                budget.multiply(targetPercent).divide(HUNDRED, MONEY_SCALE, ROUNDING)
            } else {
                portfolioTotal.multiply(targetPercent).divide(HUNDRED, MONEY_SCALE, ROUNDING)
            }

            val gapValue = targetValue.subtract(currentValue).setScale(MONEY_SCALE, ROUNDING)
            val gapPercent = targetPercent.subtract(currentPercent).setScale(PCT_SCALE, ROUNDING)

            GapModel(alloc, currentValue, currentPercent, targetPercent, gapValue, gapPercent)
        }

        val totalPositiveGap = gapModels
            .filter { it.gapValue.compareTo(ZERO) > 0 }
            .fold(ZERO) { acc, g -> acc.add(g.gapValue) }
            .setScale(MONEY_SCALE, ROUNDING)

        data class Suggestion(
            val gap: GapModel,
            val rawAmount: BigDecimal,
            val price: BigDecimal,
            var shares: Int,
        ) {
            val amount: BigDecimal get() = if (price > ZERO) price.multiply(BigDecimal(shares)).setScale(MONEY_SCALE, ROUNDING) else ZERO.setScale(MONEY_SCALE, ROUNDING)
        }

        val suggestions = gapModels.map { gap ->
            val rawAmount = if (gap.gapValue > ZERO && totalPositiveGap > ZERO) {
                budget.multiply(gap.gapValue).divide(totalPositiveGap, MONEY_SCALE, ROUNDING)
            } else {
                ZERO.setScale(MONEY_SCALE, ROUNDING)
            }
            val price = prices[gap.alloc.symbol.uppercase()] ?: ZERO
            val shares = if (price > ZERO) rawAmount.divide(price, 0, RoundingMode.DOWN).toInt() else 0
            Suggestion(gap, rawAmount, price, shares)
        }

        // Redistribute leftover budget to positions that can absorb one more share,
        // prioritized by who has the largest fractional remainder (closest to affording another share).
        var spent = suggestions.fold(ZERO) { acc, s -> acc.add(s.amount) }
        val remaining = budget.subtract(spent)

        if (remaining > ZERO) {
            val candidates = suggestions
                .filter { it.gap.gapValue > ZERO && it.price > ZERO }
                .sortedByDescending { s ->
                    val used = s.price.multiply(BigDecimal(s.shares))
                    s.rawAmount.subtract(used)
                }
            for (candidate in candidates) {
                val nextShareCost = candidate.price
                if (spent.add(nextShareCost) <= budget) {
                    candidate.shares += 1
                    spent = spent.add(nextShareCost)
                }
            }
        }

        val positions = suggestions.map { s ->
            val status = when {
                s.gap.gapValue > ZERO -> "UNDERWEIGHT"
                s.gap.gapValue < ZERO -> "OVERWEIGHT"
                else -> "ON_TARGET"
            }
            PositionCardResponse(
                symbol = s.gap.alloc.symbol,
                label = s.gap.alloc.label,
                targetPercent = s.gap.targetPercent,
                currentPercent = s.gap.currentPercent,
                currentValue = s.gap.currentValue,
                gapPercent = s.gap.gapPercent,
                gapValue = s.gap.gapValue,
                suggestedAmount = s.amount,
                suggestedShares = s.shares,
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
