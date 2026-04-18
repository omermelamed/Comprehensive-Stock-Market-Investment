package com.investment.infrastructure

import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.sql.Date
import java.sql.Timestamp
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

data class RecalculationJob(
    val id: UUID,
    val triggeredBy: UUID,
    val sellDate: LocalDate,
    val recalcFrom: LocalDate,
    val recalcTo: LocalDate,
    val totalDays: Int,
    val daysCompleted: Int,
    val status: String,
    val errorMessage: String?,
    val startedAt: Instant?,
    val completedAt: Instant?,
    val createdAt: Instant
)

@Repository
class RecalculationJobRepository(
    private val dsl: DSLContext
) {

    fun create(
        triggeredBy: UUID,
        sellDate: LocalDate,
        recalcFrom: LocalDate,
        recalcTo: LocalDate
    ): RecalculationJob {
        val totalDays = recalcFrom.until(recalcTo).days + 1
        val id = UUID.randomUUID()
        dsl.execute(
            """
            INSERT INTO recalculation_jobs (id, triggered_by, sell_date, recalc_from, recalc_to, total_days, status, created_at)
            VALUES (?::uuid, ?::uuid, ?, ?, ?, ?, 'PENDING'::recalc_status_enum, NOW())
            """.trimIndent(),
            id.toString(),
            triggeredBy.toString(),
            Date.valueOf(sellDate),
            Date.valueOf(recalcFrom),
            Date.valueOf(recalcTo),
            totalDays
        )
        return RecalculationJob(
            id = id,
            triggeredBy = triggeredBy,
            sellDate = sellDate,
            recalcFrom = recalcFrom,
            recalcTo = recalcTo,
            totalDays = totalDays,
            daysCompleted = 0,
            status = "PENDING",
            errorMessage = null,
            startedAt = null,
            completedAt = null,
            createdAt = Instant.now()
        )
    }

    fun markInProgress(jobId: UUID) {
        dsl.execute(
            """
            UPDATE recalculation_jobs
            SET status = 'IN_PROGRESS'::recalc_status_enum, started_at = NOW()
            WHERE id = ?::uuid
            """.trimIndent(),
            jobId.toString()
        )
    }

    fun updateProgress(jobId: UUID, daysCompleted: Int) {
        dsl.execute(
            """
            UPDATE recalculation_jobs SET days_completed = ? WHERE id = ?::uuid
            """.trimIndent(),
            daysCompleted,
            jobId.toString()
        )
    }

    fun markCompleted(jobId: UUID) {
        dsl.execute(
            """
            UPDATE recalculation_jobs
            SET status = 'COMPLETED'::recalc_status_enum, completed_at = NOW()
            WHERE id = ?::uuid
            """.trimIndent(),
            jobId.toString()
        )
    }

    fun markFailed(jobId: UUID, errorMessage: String) {
        dsl.execute(
            """
            UPDATE recalculation_jobs
            SET status = 'FAILED'::recalc_status_enum, error_message = ?, completed_at = NOW()
            WHERE id = ?::uuid
            """.trimIndent(),
            errorMessage,
            jobId.toString()
        )
    }

    fun findLatestActive(): RecalculationJob? {
        val record = dsl.fetchOne(
            """
            SELECT * FROM recalculation_jobs
            WHERE status IN ('PENDING', 'IN_PROGRESS')
            ORDER BY created_at DESC
            LIMIT 1
            """.trimIndent()
        ) ?: return null
        return record.toJob()
    }

    fun findById(id: UUID): RecalculationJob? {
        val record = dsl.fetchOne(
            "SELECT * FROM recalculation_jobs WHERE id = ?::uuid",
            id.toString()
        ) ?: return null
        return record.toJob()
    }

    fun countQueued(): Int {
        return dsl.fetchOne(
            "SELECT COUNT(*) FROM recalculation_jobs WHERE status IN ('PENDING', 'IN_PROGRESS')"
        )?.get(0, Long::class.java)?.toInt() ?: 0
    }

    fun findLatestFailed(): RecalculationJob? {
        val record = dsl.fetchOne(
            """
            SELECT * FROM recalculation_jobs
            WHERE status = 'FAILED'
            ORDER BY created_at DESC
            LIMIT 1
            """.trimIndent()
        ) ?: return null
        return record.toJob()
    }

    private fun org.jooq.Record.toJob(): RecalculationJob {
        return RecalculationJob(
            id = UUID.fromString(get("id", String::class.java)),
            triggeredBy = UUID.fromString(get("triggered_by", String::class.java)),
            sellDate = get("sell_date", Date::class.java).toLocalDate(),
            recalcFrom = get("recalc_from", Date::class.java).toLocalDate(),
            recalcTo = get("recalc_to", Date::class.java).toLocalDate(),
            totalDays = get("total_days", Int::class.java),
            daysCompleted = get("days_completed", Int::class.java),
            status = get("status", String::class.java),
            errorMessage = get("error_message", String::class.java),
            startedAt = get("started_at", Timestamp::class.java)?.toInstant(),
            completedAt = get("completed_at", Timestamp::class.java)?.toInstant(),
            createdAt = get("created_at", Timestamp::class.java).toInstant()
        )
    }
}
