package com.investment.domain

import com.investment.api.dto.HoldingResponse
import com.investment.api.dto.TargetAllocationResponse
import java.math.BigDecimal
import java.math.RoundingMode

/**
 * Pure calculator for recommendation gap analysis.
 * Finds underweight positions by comparing current allocation percentages against targets.
 * Only LONG track holdings contribute to portfolio total (mirrors MonthlyAllocationCalculator).
 */
object RecommendationGapCalculator {

    private val LONG_TRACKS = setOf("LONG", "LONG_EQUITY")
    private val HUNDRED = BigDecimal("100")
    private val SCALE = 2
    private val ROUNDING = RoundingMode.HALF_UP

    data class GapEntry(
        val symbol: String,
        val gapPercent: BigDecimal,
        val gapValue: BigDecimal,
        val currentPrice: BigDecimal
    )

    /**
     * Computes underweight positions sorted by gap percentage descending, limited to [limit].
     * Positions that are on-target or overweight are excluded.
     */
    fun computeUnderweightGaps(
        holdings: List<HoldingResponse>,
        allocations: List<TargetAllocationResponse>,
        prices: Map<String, BigDecimal>,
        totalPortfolioValue: BigDecimal,
        limit: Int = 5
    ): List<GapEntry> {
        return allocations.mapNotNull { alloc ->
            val upperSymbol = alloc.symbol.uppercase()
            val holding = holdings.firstOrNull { it.symbol.uppercase() == upperSymbol && it.track.uppercase() in LONG_TRACKS }
            val price = prices[upperSymbol] ?: BigDecimal.ZERO
            val currentValue = if (holding != null) price * holding.netQuantity else BigDecimal.ZERO
            val currentPercent = if (totalPortfolioValue.compareTo(BigDecimal.ZERO) != 0) {
                (currentValue.divide(totalPortfolioValue, 10, ROUNDING) * HUNDRED).setScale(SCALE, ROUNDING)
            } else {
                BigDecimal.ZERO
            }
            val gapPercent = (alloc.targetPercentage - currentPercent).setScale(SCALE, ROUNDING)
            if (gapPercent > BigDecimal.ZERO) {
                val gapValue = (totalPortfolioValue * gapPercent.divide(HUNDRED, 10, ROUNDING)).setScale(SCALE, ROUNDING)
                GapEntry(symbol = upperSymbol, gapPercent = gapPercent, gapValue = gapValue, currentPrice = price)
            } else {
                null
            }
        }.sortedByDescending { it.gapPercent }.take(limit)
    }

    fun computePortfolioTotal(
        holdings: List<HoldingResponse>,
        prices: Map<String, BigDecimal>
    ): BigDecimal {
        return holdings
            .filter { it.track.uppercase() in LONG_TRACKS }
            .sumOf { h ->
                val price = prices[h.symbol.uppercase()] ?: BigDecimal.ZERO
                price * h.netQuantity
            }.setScale(SCALE, ROUNDING)
    }
}
