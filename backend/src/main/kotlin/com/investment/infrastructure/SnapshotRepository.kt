package com.investment.infrastructure

import org.jooq.DSLContext
import org.jooq.Record
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.sql.Date
import java.time.LocalDate
import java.util.UUID

data class SnapshotRecord(
    val date: LocalDate,
    val totalValue: BigDecimal,
    val dailyPnl: BigDecimal,
    val snapshotSource: String
)

@Repository
class SnapshotRepository(
    private val dsl: DSLContext
) {

    fun existsForDate(userId: UUID, date: LocalDate): Boolean {
        val count = dsl.fetchOne(
            "SELECT COUNT(*) FROM portfolio_snapshots WHERE user_id = ?::uuid AND date = ?",
            userId.toString(),
            Date.valueOf(date)
        )?.get(0, Long::class.java) ?: 0L
        return count > 0
    }

    fun save(
        userId: UUID,
        date: LocalDate,
        totalValue: BigDecimal,
        dailyPnl: BigDecimal,
        source: String
    ) {
        dsl.execute(
            """
            INSERT INTO portfolio_snapshots (id, user_id, date, total_value, daily_pnl, snapshot_source, created_at)
            VALUES (gen_random_uuid(), ?::uuid, ?, ?, ?, ?::snapshot_source_enum, NOW())
            """.trimIndent(),
            userId.toString(),
            Date.valueOf(date),
            totalValue,
            dailyPnl,
            source
        )
    }

    fun deleteByDateRange(userId: UUID, from: LocalDate, to: LocalDate): Int {
        return dsl.execute(
            "DELETE FROM portfolio_snapshots WHERE user_id = ?::uuid AND date >= ? AND date <= ?",
            userId.toString(),
            Date.valueOf(from),
            Date.valueOf(to)
        )
    }

    fun findByDate(userId: UUID, date: LocalDate): SnapshotRecord? {
        return dsl.fetchOne(
            """
            SELECT date, total_value, daily_pnl, snapshot_source
            FROM portfolio_snapshots
            WHERE user_id = ?::uuid AND date = ?
            """.trimIndent(),
            userId.toString(),
            Date.valueOf(date)
        )?.let {
            SnapshotRecord(
                date = it.get("date", Date::class.java).toLocalDate(),
                totalValue = it.get("total_value", BigDecimal::class.java),
                dailyPnl = it.get("daily_pnl", BigDecimal::class.java),
                snapshotSource = it.get("snapshot_source", String::class.java)
            )
        }
    }

    fun findAllOrderedByDate(userId: UUID): List<SnapshotRecord> {
        return dsl.fetch(
            """
            SELECT date, total_value, daily_pnl, snapshot_source
            FROM portfolio_snapshots
            WHERE user_id = ?::uuid
            ORDER BY date ASC
            """.trimIndent(),
            userId.toString()
        ).map { it.toRecord() }
    }

    fun findByDateRange(userId: UUID, from: LocalDate, to: LocalDate): List<SnapshotRecord> {
        return dsl.fetch(
            """
            SELECT date, total_value, daily_pnl, snapshot_source
            FROM portfolio_snapshots
            WHERE user_id = ?::uuid AND date >= ? AND date <= ?
            ORDER BY date ASC
            """.trimIndent(),
            userId.toString(),
            Date.valueOf(from),
            Date.valueOf(to)
        ).map { it.toRecord() }
    }

    private fun Record.toRecord(): SnapshotRecord {
        return SnapshotRecord(
            date = get("date", Date::class.java).toLocalDate(),
            totalValue = get("total_value", BigDecimal::class.java),
            dailyPnl = get("daily_pnl", BigDecimal::class.java),
            snapshotSource = get("snapshot_source", String::class.java)
        )
    }
}
