package com.investment.infrastructure

import com.investment.api.dto.AlertResponse
import org.jooq.DSLContext
import org.jooq.Record
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.util.UUID

@Repository
class AlertRepository(
    private val dsl: DSLContext
) {

    fun findAll(): List<AlertResponse> {
        return dsl.fetch("SELECT * FROM alerts ORDER BY created_at DESC")
            .map { it.toResponse() }
    }

    fun findActive(): List<AlertResponse> {
        return dsl.fetch("SELECT * FROM alerts WHERE is_active = TRUE ORDER BY created_at DESC")
            .map { it.toResponse() }
    }

    fun insert(
        symbol: String,
        condition: String,
        thresholdPrice: BigDecimal,
        note: String?,
        source: String = "APP"
    ): AlertResponse {
        val record = dsl.fetchOne(
            """
            INSERT INTO alerts (symbol, condition, threshold_price, note, source)
            VALUES (?, ?::alert_condition_enum, ?, ?, ?)
            RETURNING *
            """.trimIndent(),
            symbol.uppercase(),
            condition.uppercase(),
            thresholdPrice,
            note,
            source.uppercase()
        ) ?: throw IllegalStateException("Insert into alerts returned no record")

        return record.toResponse()
    }

    fun delete(id: UUID) {
        val deleted = dsl.execute(
            "DELETE FROM alerts WHERE id = ?::uuid",
            id.toString()
        )
        if (deleted == 0) {
            throw NoSuchElementException("No alert found with id $id")
        }
    }

    fun trigger(id: UUID) {
        dsl.execute(
            """
            UPDATE alerts
            SET triggered_at = NOW(), is_active = FALSE, updated_at = NOW()
            WHERE id = ?::uuid
            """.trimIndent(),
            id.toString()
        )
    }

    fun dismiss(id: UUID) {
        val updated = dsl.execute(
            """
            UPDATE alerts
            SET dismissed_at = NOW(), updated_at = NOW()
            WHERE id = ?::uuid AND is_active = FALSE AND triggered_at IS NOT NULL
            """.trimIndent(),
            id.toString()
        )
        if (updated == 0) throw NoSuchElementException("No triggered alert found with id $id")
    }

    fun reEnable(id: UUID) {
        val updated = dsl.execute(
            """
            UPDATE alerts
            SET is_active = TRUE, triggered_at = NULL, dismissed_at = NULL, updated_at = NOW()
            WHERE id = ?::uuid
            """.trimIndent(),
            id.toString()
        )
        if (updated == 0) throw NoSuchElementException("No alert found with id $id")
    }

    fun countUnread(): Int {
        return dsl.fetchOne(
            """
            SELECT COUNT(*)::int FROM alerts
            WHERE is_active = FALSE AND triggered_at IS NOT NULL AND dismissed_at IS NULL
            """.trimIndent()
        )?.getValue(0, Int::class.java) ?: 0
    }

    private fun Record.toResponse(): AlertResponse {
        return AlertResponse(
            id = UUID.fromString(get("id", String::class.java)),
            symbol = get("symbol", String::class.java),
            condition = get("condition", String::class.java),
            thresholdPrice = get("threshold_price", BigDecimal::class.java),
            note = get("note", String::class.java),
            source = get("source", String::class.java) ?: "APP",
            isActive = get("is_active", Boolean::class.javaObjectType),
            triggeredAt = get("triggered_at", java.sql.Timestamp::class.java)?.toInstant(),
            dismissedAt = get("dismissed_at", java.sql.Timestamp::class.java)?.toInstant(),
            createdAt = get("created_at", java.sql.Timestamp::class.java).toInstant()
        )
    }
}
