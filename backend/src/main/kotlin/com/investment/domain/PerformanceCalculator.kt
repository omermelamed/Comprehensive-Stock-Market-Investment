package com.investment.domain

import com.investment.infrastructure.SnapshotRecord
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import kotlin.math.pow
import kotlin.math.sqrt

/**
 * Pure performance and risk calculator operating on portfolio snapshot history.
 * All inputs are value-type — no I/O, no Spring dependencies.
 */
object PerformanceCalculator {

    private val RISK_FREE_RATE_ANNUAL = 0.045          // 4.5% annualized
    private val TRADING_DAYS_PER_YEAR = sqrt(252.0)    // for vol annualization
    private val HUNDRED = BigDecimal("100")
    private val ZERO = BigDecimal.ZERO
    private val SCALE = 4
    private val MONEY_SCALE = 2
    private val ROUNDING = RoundingMode.HALF_UP

    data class PerformanceMetrics(
        val snapshotCount: Int,
        val periodStart: LocalDate?,
        val periodEnd: LocalDate?,
        /** (currentValue - costBasis) / costBasis × 100. Null when costBasis is zero. */
        val costBasisReturnPct: BigDecimal?,
        val costBasisReturnAbsolute: BigDecimal,
        /** (lastSnapshot - firstSnapshot) / firstSnapshot × 100 */
        val snapshotPeriodReturnPct: BigDecimal?,
        /** Annualized from snapshot-period return using compound formula. Null when < 2 data points. */
        val annualizedReturnPct: BigDecimal?,
        /** Annualized standard deviation of daily returns × 100. Null when < 5 daily returns. */
        val volatilityAnnualizedPct: BigDecimal?,
        /** Max peak-to-trough decline × 100. Null when < 2 snapshots. */
        val maxDrawdownPct: BigDecimal?,
        /** (annualizedReturn − riskFreeRate) / annualizedVol. Null when vol unavailable. */
        val sharpeRatio: BigDecimal?
    )

    fun compute(
        snapshots: List<SnapshotRecord>,
        currentTotalValue: BigDecimal,
        totalCostBasis: BigDecimal
    ): PerformanceMetrics {
        if (snapshots.isEmpty()) return empty(currentTotalValue, totalCostBasis)

        val sorted = snapshots.sortedBy { it.date }
        val first = sorted.first()
        val last = sorted.last()

        val costBasisReturnAbsolute = (currentTotalValue - totalCostBasis).setScale(MONEY_SCALE, ROUNDING)
        val costBasisReturnPct = if (totalCostBasis.compareTo(ZERO) != 0) {
            costBasisReturnAbsolute.divide(totalCostBasis, SCALE, ROUNDING).multiply(HUNDRED)
                .setScale(MONEY_SCALE, ROUNDING)
        } else null

        val snapshotReturn = if (first.totalValue.compareTo(ZERO) != 0) {
            (last.totalValue - first.totalValue)
                .divide(first.totalValue, SCALE, ROUNDING)
                .multiply(HUNDRED)
                .setScale(MONEY_SCALE, ROUNDING)
        } else null

        val dayCount = ChronoUnit.DAYS.between(first.date, last.date)
        val annualizedReturn = if (snapshotReturn != null && dayCount > 1) {
            val totalReturn = snapshotReturn.toDouble() / 100.0
            val annualized = (1 + totalReturn).pow(365.0 / dayCount) - 1
            BigDecimal(annualized * 100).setScale(MONEY_SCALE, ROUNDING)
        } else null

        val dailyReturns = computeDailyReturns(sorted)
        val volatility = computeAnnualizedVolatility(dailyReturns)
        val maxDrawdown = computeMaxDrawdown(sorted)
        val sharpe = computeSharpe(annualizedReturn, volatility)

        return PerformanceMetrics(
            snapshotCount = snapshots.size,
            periodStart = first.date,
            periodEnd = last.date,
            costBasisReturnPct = costBasisReturnPct,
            costBasisReturnAbsolute = costBasisReturnAbsolute,
            snapshotPeriodReturnPct = snapshotReturn,
            annualizedReturnPct = annualizedReturn,
            volatilityAnnualizedPct = volatility,
            maxDrawdownPct = maxDrawdown,
            sharpeRatio = sharpe
        )
    }

    private fun computeDailyReturns(sorted: List<SnapshotRecord>): List<Double> {
        val returns = mutableListOf<Double>()
        for (i in 1 until sorted.size) {
            val prev = sorted[i - 1].totalValue.toDouble()
            val curr = sorted[i].totalValue.toDouble()
            if (prev != 0.0) returns.add((curr - prev) / prev)
        }
        return returns
    }

    private fun computeAnnualizedVolatility(dailyReturns: List<Double>): BigDecimal? {
        if (dailyReturns.size < 5) return null
        val mean = dailyReturns.average()
        val variance = dailyReturns.sumOf { r -> (r - mean).pow(2) } / (dailyReturns.size - 1)
        val stdDev = sqrt(variance)
        val annualized = stdDev * TRADING_DAYS_PER_YEAR * 100.0  // as percentage
        return BigDecimal(annualized).setScale(MONEY_SCALE, ROUNDING)
    }

    private fun computeMaxDrawdown(sorted: List<SnapshotRecord>): BigDecimal? {
        if (sorted.size < 2) return null
        var peak = sorted[0].totalValue.toDouble()
        var maxDrawdown = 0.0
        for (record in sorted) {
            val v = record.totalValue.toDouble()
            if (v > peak) peak = v
            if (peak > 0.0) {
                val drawdown = (peak - v) / peak
                if (drawdown > maxDrawdown) maxDrawdown = drawdown
            }
        }
        return BigDecimal(maxDrawdown * 100).setScale(MONEY_SCALE, ROUNDING)
    }

    private fun computeSharpe(annualizedReturnPct: BigDecimal?, volatilityPct: BigDecimal?): BigDecimal? {
        if (annualizedReturnPct == null || volatilityPct == null) return null
        if (volatilityPct.compareTo(ZERO) == 0) return null
        val returnDecimal = annualizedReturnPct.toDouble() / 100.0
        val volDecimal = volatilityPct.toDouble() / 100.0
        val sharpe = (returnDecimal - RISK_FREE_RATE_ANNUAL) / volDecimal
        return BigDecimal(sharpe).setScale(2, ROUNDING)
    }

    private fun empty(currentTotalValue: BigDecimal, totalCostBasis: BigDecimal): PerformanceMetrics {
        val abs = (currentTotalValue - totalCostBasis).setScale(MONEY_SCALE, ROUNDING)
        val pct = if (totalCostBasis.compareTo(ZERO) != 0)
            abs.divide(totalCostBasis, SCALE, ROUNDING).multiply(HUNDRED).setScale(MONEY_SCALE, ROUNDING)
        else null
        return PerformanceMetrics(
            snapshotCount = 0,
            periodStart = null, periodEnd = null,
            costBasisReturnPct = pct, costBasisReturnAbsolute = abs,
            snapshotPeriodReturnPct = null, annualizedReturnPct = null,
            volatilityAnnualizedPct = null, maxDrawdownPct = null, sharpeRatio = null
        )
    }
}
