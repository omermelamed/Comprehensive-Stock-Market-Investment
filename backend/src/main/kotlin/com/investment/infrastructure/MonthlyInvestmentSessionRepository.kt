package com.investment.infrastructure

import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.sql.Date
import java.time.LocalDate
import java.util.UUID

@Repository
class MonthlyInvestmentSessionRepository(
    private val dsl: DSLContext
) {

    /** Latest completed monthly investment session date, if any. */
    fun findLastSessionDate(userId: UUID): LocalDate? {
        val r = dsl.fetchOne(
            "SELECT MAX(session_date) AS last_session FROM monthly_investment_sessions WHERE user_id = ?::uuid",
            userId
        ) ?: return null
        val sqlDate = r.get("last_session", Date::class.java) ?: return null
        return sqlDate.toLocalDate()
    }
}
