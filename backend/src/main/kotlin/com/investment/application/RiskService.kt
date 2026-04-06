package com.investment.application

import com.investment.api.dto.ConcentrationEntry
import com.investment.api.dto.DriftEntry
import com.investment.api.dto.FundamentalsData
import com.investment.api.dto.GeographicEntry
import com.investment.api.dto.HoldingDashboardResponse
import com.investment.api.dto.RiskMetricsResponse
import com.investment.api.dto.RiskThresholdsRequest
import com.investment.api.dto.RiskThresholdsResponse
import com.investment.api.dto.RiskWarning
import com.investment.api.dto.RiskWarningsResponse
import com.investment.api.dto.SectorEntry
import com.investment.domain.PerformanceCalculator
import com.investment.infrastructure.AllocationRepository
import com.investment.infrastructure.MonthlyInvestmentSessionRepository
import com.investment.infrastructure.RiskThresholdRepository
import com.investment.infrastructure.SnapshotRepository
import com.investment.infrastructure.market.AlphaVantageAdapter
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Clock
import java.time.LocalDate
import java.time.temporal.ChronoUnit

@Service
class RiskService(
    private val portfolioSummaryService: PortfolioSummaryService,
    private val allocationRepository: AllocationRepository,
    private val alphaVantageAdapter: AlphaVantageAdapter,
    private val riskThresholdRepository: RiskThresholdRepository,
    private val snapshotRepository: SnapshotRepository,
    private val monthlyInvestmentSessionRepository: MonthlyInvestmentSessionRepository,
    private val clock: Clock
) {

    private val scale2 = RoundingMode.HALF_UP

    fun getRiskMetrics(): RiskMetricsResponse {
        val holdings = portfolioSummaryService.getHoldingsDashboard()
        val thresholds = riskThresholdRepository.get()

        if (holdings.isEmpty()) {
            return RiskMetricsResponse(
                concentrationRisk = emptyList(),
                allocationDrift = emptyList(),
                sectorExposure = emptyList(),
                geographicExposure = emptyList(),
                portfolioBeta = null,
                volatilityAnnualizedPct = null,
                maxDrawdownPct = null,
                sharpeRatio = null
            )
        }

        val summary = portfolioSummaryService.getPortfolioSummary()
        val snapshots = snapshotRepository.findAllOrderedByDate()
        val perf = PerformanceCalculator.compute(
            snapshots = snapshots,
            currentTotalValue = summary.totalValue,
            totalCostBasis = summary.totalCostBasis
        )

        val concentrationRisk = holdings.map { h ->
            ConcentrationEntry(
                symbol = h.symbol,
                label = h.label,
                weightPct = h.currentPercent,
                exceedsThreshold = h.currentPercent > thresholds.maxSinglePositionPct
            )
        }

        val dashboardBySymbol = holdings.associateBy { it.symbol.uppercase() }
        val allocationDrift = allocationRepository.findAll().map { alloc ->
            val upper = alloc.symbol.uppercase()
            val row = dashboardBySymbol[upper]
            val targetPct = alloc.targetPercentage.setScale(2, scale2)
            val currentPct = row?.currentPercent?.setScale(2, scale2) ?: BigDecimal.ZERO.setScale(2, scale2)
            val driftPct = (currentPct - targetPct).setScale(2, scale2)
            DriftEntry(
                symbol = alloc.symbol,
                label = alloc.label,
                targetPct = targetPct,
                currentPct = currentPct,
                driftPct = driftPct,
                status = row?.allocationStatus ?: "UNTRACKED"
            )
        }

        val fundamentalsBySymbol = holdings.associate { h ->
            val sym = h.symbol.uppercase()
            sym to alphaVantageAdapter.fetchFundamentals(sym)
        }

        val sectorExposure = buildSectorExposure(fundamentalsBySymbol, holdings, thresholds.maxSectorPct)
        val geographicExposure = buildGeographicExposure(fundamentalsBySymbol, holdings)

        return RiskMetricsResponse(
            concentrationRisk = concentrationRisk,
            allocationDrift = allocationDrift,
            sectorExposure = sectorExposure,
            geographicExposure = geographicExposure,
            portfolioBeta = null,
            volatilityAnnualizedPct = perf.volatilityAnnualizedPct,
            maxDrawdownPct = perf.maxDrawdownPct,
            sharpeRatio = perf.sharpeRatio
        )
    }

    private fun buildSectorExposure(
        fundamentalsBySymbol: Map<String, FundamentalsData?>,
        holdings: List<HoldingDashboardResponse>,
        maxSectorPct: BigDecimal
    ): List<SectorEntry> {
        val sectorToSymbols = mutableMapOf<String, MutableSet<String>>()
        val sectorWeights = mutableMapOf<String, BigDecimal>()

        for (h in holdings) {
            val sym = h.symbol.uppercase()
            val sector = fundamentalsBySymbol[sym]?.sector?.takeIf { !it.isNullOrBlank() } ?: "Unknown"
            sectorToSymbols.getOrPut(sector) { mutableSetOf() }.add(sym)
            sectorWeights[sector] = (sectorWeights[sector] ?: BigDecimal.ZERO).add(h.currentPercent)
        }

        return sectorWeights.keys.sorted().map { sector ->
            val weight = sectorWeights[sector]?.setScale(2, scale2) ?: BigDecimal.ZERO.setScale(2, scale2)
            SectorEntry(
                sector = sector,
                weightPct = weight,
                symbols = sectorToSymbols[sector]?.sorted() ?: emptyList(),
                exceedsThreshold = weight > maxSectorPct
            )
        }
    }

    private fun buildGeographicExposure(
        fundamentalsBySymbol: Map<String, FundamentalsData?>,
        holdings: List<HoldingDashboardResponse>
    ): List<GeographicEntry> {
        val regionToSymbols = mutableMapOf<String, MutableSet<String>>()
        val regionWeights = mutableMapOf<String, BigDecimal>()

        for (h in holdings) {
            val sym = h.symbol.uppercase()
            val region = fundamentalsBySymbol[sym]?.country?.takeIf { !it.isNullOrBlank() } ?: "Unknown"
            regionToSymbols.getOrPut(region) { mutableSetOf() }.add(sym)
            regionWeights[region] = (regionWeights[region] ?: BigDecimal.ZERO).add(h.currentPercent)
        }

        return regionWeights.keys.sorted().map { region ->
            GeographicEntry(
                region = region,
                weightPct = regionWeights[region]?.setScale(2, scale2) ?: BigDecimal.ZERO.setScale(2, scale2),
                symbols = regionToSymbols[region]?.sorted() ?: emptyList()
            )
        }
    }

    fun getRiskWarnings(): RiskWarningsResponse {
        val thresholds = riskThresholdRepository.get()
        val holdings = portfolioSummaryService.getHoldingsDashboard()
        val summary = portfolioSummaryService.getPortfolioSummary()
        val snapshots = snapshotRepository.findAllOrderedByDate()
        val perf = PerformanceCalculator.compute(
            snapshots = snapshots,
            currentTotalValue = summary.totalValue,
            totalCostBasis = summary.totalCostBasis
        )

        val lastSession = monthlyInvestmentSessionRepository.findLastSessionDate()
        val today = LocalDate.now(clock)
        val daysSinceRebalance = lastSession?.let { ChronoUnit.DAYS.between(it, today).toInt() }

        val warnings = mutableListOf<RiskWarning>()

        val dashboardBySymbol = holdings.associateBy { it.symbol.uppercase() }

        for (h in holdings) {
            if (h.currentPercent > thresholds.maxSinglePositionPct) {
                warnings.add(
                    RiskWarning(
                        type = "CONCENTRATION",
                        severity = "WARNING",
                        message = "Position ${h.symbol} exceeds maximum single-position weight.",
                        symbol = h.symbol,
                        currentValue = h.currentPercent,
                        thresholdValue = thresholds.maxSinglePositionPct
                    )
                )
            }
        }

        val fundamentalsBySymbol = holdings.associate { h ->
            h.symbol.uppercase() to alphaVantageAdapter.fetchFundamentals(h.symbol.uppercase())
        }
        val sectorWeights = mutableMapOf<String, BigDecimal>()
        for (h in holdings) {
            val sym = h.symbol.uppercase()
            val sector = fundamentalsBySymbol[sym]?.sector?.takeIf { !it.isNullOrBlank() } ?: "Unknown"
            sectorWeights[sector] = (sectorWeights[sector] ?: BigDecimal.ZERO).add(h.currentPercent)
        }
        for ((sector, weight) in sectorWeights) {
            if (weight > thresholds.maxSectorPct) {
                warnings.add(
                    RiskWarning(
                        type = "SECTOR_CONCENTRATION",
                        severity = "WARNING",
                        message = "Sector \"$sector\" exceeds maximum sector weight.",
                        symbol = null,
                        currentValue = weight.setScale(2, scale2),
                        thresholdValue = thresholds.maxSectorPct
                    )
                )
            }
        }

        val maxDd = perf.maxDrawdownPct
        if (maxDd != null && maxDd > thresholds.maxDrawdownPct) {
            warnings.add(
                RiskWarning(
                    type = "MAX_DRAWDOWN",
                    severity = "WARNING",
                    message = "Portfolio max drawdown exceeds configured threshold.",
                    currentValue = maxDd,
                    thresholdValue = thresholds.maxDrawdownPct
                )
            )
        }

        for (alloc in allocationRepository.findAll()) {
            val row = dashboardBySymbol[alloc.symbol.uppercase()]
            val absDrift = when {
                row != null && row.targetPercent != null -> row.drift.abs()
                row == null -> alloc.targetPercentage
                else -> continue
            }
            if (absDrift > thresholds.driftWarningPct) {
                warnings.add(
                    RiskWarning(
                        type = "ALLOCATION_DRIFT",
                        severity = "WARNING",
                        message = "Allocation drift for ${alloc.symbol} exceeds warning threshold.",
                        symbol = alloc.symbol,
                        currentValue = absDrift,
                        thresholdValue = thresholds.driftWarningPct
                    )
                )
            }
        }

        if (lastSession != null && daysSinceRebalance != null &&
            daysSinceRebalance > thresholds.rebalanceReminderDays
        ) {
            warnings.add(
                RiskWarning(
                    type = "REBALANCE_REMINDER",
                    severity = "INFO",
                    message = "It has been more than ${thresholds.rebalanceReminderDays} days since the last monthly investment session.",
                    currentValue = BigDecimal.valueOf(daysSinceRebalance.toLong()),
                    thresholdValue = BigDecimal.valueOf(thresholds.rebalanceReminderDays.toLong())
                )
            )
        }

        return RiskWarningsResponse(
            warnings = warnings,
            lastRebalanceDate = lastSession?.toString(),
            daysSinceRebalance = daysSinceRebalance
        )
    }

    fun getThresholds(): RiskThresholdsResponse = riskThresholdRepository.get()

    fun updateThresholds(request: RiskThresholdsRequest): RiskThresholdsResponse =
        riskThresholdRepository.update(request)
}
