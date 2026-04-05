package com.investment.domain

import com.investment.api.dto.HoldingDashboardResponse
import com.investment.api.dto.HoldingResponse
import com.investment.api.dto.PortfolioSummaryResponse
import java.math.BigDecimal
import java.math.MathContext
import java.math.RoundingMode

data class HoldingMetrics(
    val symbol: String,
    val label: String?,
    val track: String,
    val quantity: BigDecimal,
    val avgBuyPrice: BigDecimal,
    val currentPrice: BigDecimal,
    val currentValue: BigDecimal,
    val costBasis: BigDecimal,
    val pnlAbsolute: BigDecimal,
    val pnlPercent: BigDecimal,
    val targetPercent: BigDecimal?,
    val currentPercent: BigDecimal,
    val allocationStatus: AllocationStatus,
    val drift: BigDecimal
)

object PortfolioCalculator {

    private val HUNDRED = BigDecimal("100")
    private val SCALE = 2
    private val ROUNDING = RoundingMode.HALF_UP

    fun computeHoldingMetrics(
        holding: HoldingResponse,
        currentPrice: BigDecimal,
        totalPortfolioValue: BigDecimal,
        targetPercent: BigDecimal?,
        label: String?
    ): HoldingMetrics {
        val currentValue = (holding.netQuantity * currentPrice).setScale(SCALE, ROUNDING)
        val costBasis = holding.totalCostBasis.setScale(SCALE, ROUNDING)
        val pnlAbsolute = (currentValue - costBasis).setScale(SCALE, ROUNDING)

        val pnlPercent = if (costBasis.compareTo(BigDecimal.ZERO) != 0) {
            (pnlAbsolute.divide(costBasis, 10, ROUNDING) * HUNDRED).setScale(SCALE, ROUNDING)
        } else {
            BigDecimal.ZERO.setScale(SCALE, ROUNDING)
        }

        val currentPercent = if (totalPortfolioValue.compareTo(BigDecimal.ZERO) != 0) {
            (currentValue.divide(totalPortfolioValue, 10, ROUNDING) * HUNDRED).setScale(SCALE, ROUNDING)
        } else {
            BigDecimal.ZERO.setScale(SCALE, ROUNDING)
        }

        val (status, drift) = if (targetPercent != null) {
            val d = (currentPercent - targetPercent).setScale(SCALE, ROUNDING)
            AllocationStatusCalculator.compute(currentPercent, targetPercent) to d
        } else {
            AllocationStatus.UNTRACKED to BigDecimal.ZERO.setScale(SCALE, ROUNDING)
        }

        return HoldingMetrics(
            symbol = holding.symbol,
            label = label,
            track = holding.track,
            quantity = holding.netQuantity,
            avgBuyPrice = holding.avgBuyPrice.setScale(SCALE, ROUNDING),
            currentPrice = currentPrice.setScale(SCALE, ROUNDING),
            currentValue = currentValue,
            costBasis = costBasis,
            pnlAbsolute = pnlAbsolute,
            pnlPercent = pnlPercent,
            targetPercent = targetPercent?.setScale(SCALE, ROUNDING),
            currentPercent = currentPercent,
            allocationStatus = status,
            drift = drift
        )
    }

    fun computePortfolioSummary(holdingMetrics: List<HoldingMetrics>, currency: String): PortfolioSummaryResponse {
        val totalValue = holdingMetrics.sumOf { it.currentValue }.setScale(SCALE, ROUNDING)
        val totalCostBasis = holdingMetrics.sumOf { it.costBasis }.setScale(SCALE, ROUNDING)
        val totalPnlAbsolute = (totalValue - totalCostBasis).setScale(SCALE, ROUNDING)

        val totalPnlPercent = if (totalCostBasis.compareTo(BigDecimal.ZERO) != 0) {
            (totalPnlAbsolute.divide(totalCostBasis, 10, ROUNDING) * HUNDRED).setScale(SCALE, ROUNDING)
        } else {
            BigDecimal.ZERO.setScale(SCALE, ROUNDING)
        }

        val trackedMetrics = holdingMetrics.filter { it.targetPercent != null }
        val allocationHealthScore = if (trackedMetrics.isEmpty()) {
            BigDecimal.ZERO.setScale(SCALE, ROUNDING)
        } else {
            val sumAbsDrift = trackedMetrics.sumOf { it.drift.abs() }
            (sumAbsDrift.divide(BigDecimal(trackedMetrics.size), 10, ROUNDING)).setScale(SCALE, ROUNDING)
        }

        return PortfolioSummaryResponse(
            totalValue = totalValue,
            totalCostBasis = totalCostBasis,
            totalPnlAbsolute = totalPnlAbsolute,
            totalPnlPercent = totalPnlPercent,
            currency = currency,
            holdingCount = holdingMetrics.size,
            allocationHealthScore = allocationHealthScore
        )
    }

    fun toDto(metrics: HoldingMetrics): HoldingDashboardResponse {
        return HoldingDashboardResponse(
            symbol = metrics.symbol,
            label = metrics.label,
            track = metrics.track,
            quantity = metrics.quantity,
            avgBuyPrice = metrics.avgBuyPrice,
            currentPrice = metrics.currentPrice,
            currentValue = metrics.currentValue,
            costBasis = metrics.costBasis,
            pnlAbsolute = metrics.pnlAbsolute,
            pnlPercent = metrics.pnlPercent,
            targetPercent = metrics.targetPercent,
            currentPercent = metrics.currentPercent,
            allocationStatus = metrics.allocationStatus::class.simpleName ?: "UNTRACKED",
            drift = metrics.drift
        )
    }
}
