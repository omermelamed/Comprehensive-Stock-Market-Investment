package com.investment.application

import com.investment.api.dto.AnalyticsBenchmark
import com.investment.api.dto.AnalyticsBenchmarkPoint
import com.investment.api.dto.AnalyticsChartPoint
import com.investment.api.dto.AnalyticsPerformanceMetrics
import com.investment.api.dto.AnalyticsPositionMetric
import com.investment.api.dto.AnalyticsResponse
import com.investment.api.dto.MonthlyReturnEntry
import com.investment.api.dto.MonthlyReturnsResponse
import com.investment.api.dto.RealizedPnlSummary
import com.investment.api.dto.RealizedTradeEntry
import com.investment.domain.PerformanceCalculator
import com.investment.domain.RealizedPnlCalculator
import com.investment.domain.UnrealizedPnlCalculator
import com.investment.infrastructure.SnapshotRecord
import com.investment.infrastructure.SnapshotRepository
import com.investment.infrastructure.TransactionRepository
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
    private val benchmarkService: BenchmarkService,
    private val transactionRepository: TransactionRepository,
    private val clock: Clock
) {

    fun getAnalytics(range: String): AnalyticsResponse {
        val userId = RequestContext.get()
        val today = LocalDate.now(clock)
        val snapshots = snapshotsForRange(userId, range, today)

        val summary = portfolioSummaryService.getPortfolioSummary()
        val holdings = portfolioSummaryService.getHoldingsDashboard()
        val currency = userProfileService.getProfile()?.preferredCurrency ?: summary.currency

        val metrics = PerformanceCalculator.compute(
            snapshots = snapshots,
            currentTotalValue = summary.totalValue,
            totalCostBasis = summary.totalCostBasis
        )

        // Build indexed portfolio chart points (100 at first snapshot)
        val firstValue = snapshots.firstOrNull()?.totalValue ?: BigDecimal.ZERO
        val chartPoints = snapshots.map { s ->
            val index = if (firstValue.compareTo(BigDecimal.ZERO) != 0) {
                s.totalValue.divide(firstValue, 6, RoundingMode.HALF_UP)
                    .multiply(BigDecimal("100")).setScale(2, RoundingMode.HALF_UP)
            } else BigDecimal("100")
            AnalyticsChartPoint(
                date = s.date.toString(),
                portfolioValue = s.totalValue,
                portfolioIndex = index
            )
        }

        // Benchmark: use date range from snapshots when available, otherwise the requested range
        val fromDate = snapshots.firstOrNull()?.date ?: today.minusDays(rangeInDays(range))
        val toDate = snapshots.lastOrNull()?.date ?: today
        val benchmark = buildBenchmark(fromDate, toDate)

        val totalValue = summary.totalValue
        val positionInputs = holdings.map { h ->
            UnrealizedPnlCalculator.PositionInput(
                symbol = h.symbol,
                label = h.label,
                currentValue = h.currentValue,
                costBasis = h.costBasis
            )
        }
        val positions = UnrealizedPnlCalculator.compute(positionInputs, totalValue).map { p ->
            AnalyticsPositionMetric(
                symbol = p.symbol,
                label = p.label,
                currentValue = p.currentValue,
                costBasis = p.costBasis,
                pnlAbsolute = p.pnlAbsolute,
                pnlPercent = p.pnlPercent,
                portfolioWeightPct = p.portfolioWeightPct
            )
        }

        val ledgerRows = transactionRepository.findAllOrderedByExecutedAtAsc(userId)
        val realizedEntries = ledgerRows.map { row ->
            RealizedPnlCalculator.TransactionEntry(
                symbol = row.symbol,
                type = row.type,
                quantity = row.quantity,
                pricePerUnit = row.pricePerUnit,
                executedAt = row.executedAt
            )
        }
        val realizedResult = RealizedPnlCalculator.compute(realizedEntries)
        val realizedPnl = RealizedPnlSummary(
            totalRealizedPnl = realizedResult.totalRealizedPnl,
            trades = realizedResult.trades.map { t ->
                RealizedTradeEntry(
                    symbol = t.symbol,
                    quantity = t.quantity,
                    buyPrice = t.buyPrice,
                    sellPrice = t.sellPrice,
                    pnl = t.pnl,
                    pnlPercent = t.pnlPercent,
                    closedAt = t.closedAt.toString()
                )
            }
        )

        return AnalyticsResponse(
            range = range,
            currency = currency,
            performanceMetrics = metrics.toDto(),
            chartPoints = chartPoints,
            positions = positions,
            benchmark = benchmark,
            realizedPnl = realizedPnl
        )
    }

    fun getMonthlyReturns(range: String): MonthlyReturnsResponse {
        val userId = RequestContext.get()
        val today = LocalDate.now(clock)
        val snapshots = snapshotsForRange(userId, range, today)
        val summary = portfolioSummaryService.getPortfolioSummary()
        val currency = userProfileService.getProfile()?.preferredCurrency ?: summary.currency

        val byMonth = snapshots.groupBy { snap ->
            val m = snap.date.monthValue
            "${snap.date.year}-${if (m < 10) "0$m" else "$m"}"
        }
        val months = byMonth.keys.sorted().map { monthKey ->
            val snaps = byMonth.getValue(monthKey).sortedBy { it.date }
            val startValue = snaps.first().totalValue
            val endValue = snaps.last().totalValue
            val returnAbsolute = (endValue - startValue).setScale(2, RoundingMode.HALF_UP)
            val returnPct = if (startValue.compareTo(BigDecimal.ZERO) != 0) {
                (endValue - startValue).divide(startValue, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal("100")).setScale(2, RoundingMode.HALF_UP)
            } else {
                BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
            }
            MonthlyReturnEntry(
                month = monthKey,
                startValue = startValue,
                endValue = endValue,
                returnAbsolute = returnAbsolute,
                returnPct = returnPct
            )
        }
        return MonthlyReturnsResponse(
            range = range,
            currency = currency,
            months = months
        )
    }

    fun getBenchmarkStandalone(symbol: String, from: LocalDate, to: LocalDate): AnalyticsBenchmark? {
        return buildBenchmark(from, to, symbol)
    }

    private fun snapshotsForRange(userId: java.util.UUID, range: String, today: LocalDate): List<SnapshotRecord> {
        return when (range) {
            "1M" -> snapshotRepository.findByDateRange(userId, today.minusDays(30), today)
            "3M" -> snapshotRepository.findByDateRange(userId, today.minusDays(90), today)
            "6M" -> snapshotRepository.findByDateRange(userId, today.minusDays(180), today)
            "1Y" -> snapshotRepository.findByDateRange(userId, today.minusDays(365), today)
            "ALL" -> snapshotRepository.findAllOrderedByDate(userId)
            else -> snapshotRepository.findByDateRange(userId, today.minusDays(30), today)
        }
    }

    private fun buildBenchmark(fromDate: LocalDate, toDate: LocalDate, symbol: String = "SPY"): AnalyticsBenchmark? {
        val result = benchmarkService.getBenchmark(symbol, fromDate, toDate) ?: return null
        return AnalyticsBenchmark(
            symbol = result.symbol,
            periodReturnPct = result.periodReturnPct,
            points = result.indexedPoints.map { p ->
                AnalyticsBenchmarkPoint(date = p.date, benchmarkIndex = p.index)
            }
        )
    }

    private fun rangeInDays(range: String): Long = when (range) {
        "1M" -> 30L; "3M" -> 90L; "6M" -> 180L; "1Y" -> 365L; else -> 730L
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
