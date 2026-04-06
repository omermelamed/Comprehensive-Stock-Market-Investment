package com.investment.infrastructure

import com.investment.api.dto.RiskThresholdsRequest
import com.investment.api.dto.RiskThresholdsResponse
import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.math.BigDecimal

@Repository
class RiskThresholdRepository(
    private val dsl: DSLContext
) {

    fun get(): RiskThresholdsResponse {
        val r = dsl.fetchOne("SELECT * FROM risk_thresholds LIMIT 1")
            ?: return RiskThresholdsResponse(
                BigDecimal("25"),
                BigDecimal("40"),
                BigDecimal("20"),
                BigDecimal("10"),
                30
            )
        return RiskThresholdsResponse(
            maxSinglePositionPct = r.get("max_single_position_pct", BigDecimal::class.java),
            maxSectorPct = r.get("max_sector_pct", BigDecimal::class.java),
            maxDrawdownPct = r.get("max_drawdown_pct", BigDecimal::class.java),
            driftWarningPct = r.get("drift_warning_pct", BigDecimal::class.java),
            rebalanceReminderDays = r.get("rebalance_reminder_days", Int::class.java)
        )
    }

    fun update(req: RiskThresholdsRequest): RiskThresholdsResponse {
        val sets = mutableListOf<String>()
        val params = mutableListOf<Any>()
        if (req.maxSinglePositionPct != null) {
            sets.add("max_single_position_pct = ?")
            params.add(req.maxSinglePositionPct)
        }
        if (req.maxSectorPct != null) {
            sets.add("max_sector_pct = ?")
            params.add(req.maxSectorPct)
        }
        if (req.maxDrawdownPct != null) {
            sets.add("max_drawdown_pct = ?")
            params.add(req.maxDrawdownPct)
        }
        if (req.driftWarningPct != null) {
            sets.add("drift_warning_pct = ?")
            params.add(req.driftWarningPct)
        }
        if (req.rebalanceReminderDays != null) {
            sets.add("rebalance_reminder_days = ?")
            params.add(req.rebalanceReminderDays)
        }
        if (sets.isNotEmpty()) {
            val sql = "UPDATE risk_thresholds SET ${sets.joinToString(", ")} WHERE TRUE"
            dsl.execute(sql, *params.toTypedArray())
        }
        return get()
    }
}
