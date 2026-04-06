package com.investment.api.dto

import java.math.BigDecimal

data class RiskMetricsResponse(
    val concentrationRisk: List<ConcentrationEntry>,
    val allocationDrift: List<DriftEntry>,
    val sectorExposure: List<SectorEntry>,
    val geographicExposure: List<GeographicEntry>,
    val portfolioBeta: BigDecimal?,
    val volatilityAnnualizedPct: BigDecimal?,
    val maxDrawdownPct: BigDecimal?,
    val sharpeRatio: BigDecimal?
)

data class ConcentrationEntry(
    val symbol: String,
    val label: String?,
    val weightPct: BigDecimal,
    val exceedsThreshold: Boolean
)

data class DriftEntry(
    val symbol: String,
    val label: String?,
    val targetPct: BigDecimal,
    val currentPct: BigDecimal,
    val driftPct: BigDecimal,
    val status: String
)

data class SectorEntry(
    val sector: String,
    val weightPct: BigDecimal,
    val symbols: List<String>,
    val exceedsThreshold: Boolean
)

data class GeographicEntry(
    val region: String,
    val weightPct: BigDecimal,
    val symbols: List<String>
)

data class RiskWarning(
    val type: String,
    val severity: String,
    val message: String,
    val symbol: String? = null,
    val currentValue: BigDecimal? = null,
    val thresholdValue: BigDecimal? = null
)

data class RiskWarningsResponse(
    val warnings: List<RiskWarning>,
    val lastRebalanceDate: String?,
    val daysSinceRebalance: Int?
)

data class RiskThresholdsRequest(
    val maxSinglePositionPct: BigDecimal? = null,
    val maxSectorPct: BigDecimal? = null,
    val maxDrawdownPct: BigDecimal? = null,
    val driftWarningPct: BigDecimal? = null,
    val rebalanceReminderDays: Int? = null
)

data class RiskThresholdsResponse(
    val maxSinglePositionPct: BigDecimal,
    val maxSectorPct: BigDecimal,
    val maxDrawdownPct: BigDecimal,
    val driftWarningPct: BigDecimal,
    val rebalanceReminderDays: Int
)
