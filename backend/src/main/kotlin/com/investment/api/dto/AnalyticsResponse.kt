package com.investment.api.dto

import java.math.BigDecimal

data class AnalyticsPerformanceMetrics(
    val snapshotCount: Int,
    val periodStart: String?,
    val periodEnd: String?,
    /** Return relative to cost basis (actual money invested). */
    val costBasisReturnPct: BigDecimal?,
    val costBasisReturnAbsolute: BigDecimal,
    /** Return over the selected snapshot window (first to last snapshot). */
    val snapshotPeriodReturnPct: BigDecimal?,
    /** Compound-annualized return over the snapshot window. Null when < 2 days of history. */
    val annualizedReturnPct: BigDecimal?,
    /** Annualized std-dev of daily returns (%). Null when < 5 daily returns. */
    val volatilityAnnualizedPct: BigDecimal?,
    /** Max peak-to-trough decline (%). Null when < 2 snapshots. */
    val maxDrawdownPct: BigDecimal?,
    /** (annualizedReturn − 4.5%) / annualizedVol. Null when vol unavailable. */
    val sharpeRatio: BigDecimal?
)

data class AnalyticsChartPoint(
    val date: String,
    val portfolioValue: BigDecimal,
    /** Portfolio indexed to 100 at the first snapshot in the range. */
    val portfolioIndex: BigDecimal
)

data class AnalyticsBenchmarkPoint(
    val date: String,
    /** Benchmark (SPY) indexed to 100 at the first available price in the range. */
    val benchmarkIndex: BigDecimal
)

data class AnalyticsBenchmark(
    val symbol: String,
    val periodReturnPct: BigDecimal,
    val points: List<AnalyticsBenchmarkPoint>
)

data class AnalyticsPositionMetric(
    val symbol: String,
    val label: String?,
    val currentValue: BigDecimal,
    val costBasis: BigDecimal,
    val pnlAbsolute: BigDecimal,
    val pnlPercent: BigDecimal,
    /** Position's weight in current portfolio (%). */
    val portfolioWeightPct: BigDecimal
)

data class AnalyticsResponse(
    val range: String,
    val currency: String,
    val performanceMetrics: AnalyticsPerformanceMetrics,
    val chartPoints: List<AnalyticsChartPoint>,
    val positions: List<AnalyticsPositionMetric>,
    /** Null when benchmark data is unavailable (network failure, no history). */
    val benchmark: AnalyticsBenchmark?
)
