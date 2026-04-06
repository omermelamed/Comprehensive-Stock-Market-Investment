package com.investment.application

import com.investment.api.dto.AnalyticsChartPoint
import com.investment.api.dto.AnalyticsPerformanceMetrics
import com.investment.api.dto.AnalyticsPositionMetric
import com.investment.api.dto.AnalyticsResponse
import com.investment.domain.PerformanceCalculator
import com.investment.infrastructure.SnapshotRepository
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Clock
import java.time.LocalDate

@Service
class AnalyticsService(
    private val snapshotRepository: SnapshotRepository,
    private val portfolioSummaryService: PortfolioSummaryService,
    private val userProfileService: UserProfileService,
    private val clock: Clock
) {

    fun getAnalytics(range: String): AnalyticsResponse {
        val today = LocalDate.now(clock)
        val snapshots = when (range) {
            "1M"  -> snapshotRepository.findByDateRange(today.minusDays(30), today)
            "3M"  -> snapshotRepository.findByDateRange(today.minusDays(90), today)
            "6M"  -> snapshotRepository.findByDateRange(today.minusDays(180), today)
            "1Y"  -> snapshotRepository.findByDateRange(today.minusDays(365), today)
            "ALL" -> snapshotRepository.findAllOrderedByDate()
            else  -> snapshotRepository.findByDateRange(today.minusDays(30), today)
        }

        val summary = portfolioSummaryService.getPortfolioSummary()
        val holdings = portfolioSummaryService.getHoldingsDashboard()
        val currency = userProfileService.getProfile()?.preferredCurrency ?: summary.currency

        val metrics = PerformanceCalculator.compute(
            snapshots = snapshots,
            currentTotalValue = summary.totalValue,
            totalCostBasis = summary.totalCostBasis
        )

        val chartPoints = snapshots.map { s ->
            AnalyticsChartPoint(date = s.date.toString(), portfolioValue = s.totalValue)
        }

        val totalValue = summary.totalValue
        val positions = holdings.map { h ->
            val weightPct = if (totalValue.compareTo(BigDecimal.ZERO) != 0) {
                h.currentValue.divide(totalValue, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal("100"))
                    .setScale(2, RoundingMode.HALF_UP)
            } else BigDecimal.ZERO
            AnalyticsPositionMetric(
                symbol = h.symbol,
                label = h.label,
                currentValue = h.currentValue,
                costBasis = h.costBasis,
                pnlAbsolute = h.pnlAbsolute,
                pnlPercent = h.pnlPercent,
                portfolioWeightPct = weightPct
            )
        }.sortedByDescending { it.currentValue }

        return AnalyticsResponse(
            range = range,
            currency = currency,
            performanceMetrics = metrics.toDto(),
            chartPoints = chartPoints,
            positions = positions
        )
    }

    private fun PerformanceCalculator.PerformanceMetrics.toDto() = AnalyticsPerformanceMetrics(
        snapshotCount = snapshotCount,
        periodStart = periodStart?.toString(),
        periodEnd = periodEnd?.toString(),
        costBasisReturnPct = costBasisReturnPct,
        costBasisReturnAbsolute = costBasisReturnAbsolute,
        snapshotPeriodReturnPct = snapshotPeriodReturnPct,
        annualizedReturnPct = annualizedReturnPct,
        volatilityAnnualizedPct = volatilityAnnualizedPct,
        maxDrawdownPct = maxDrawdownPct,
        sharpeRatio = sharpeRatio
    )
}
