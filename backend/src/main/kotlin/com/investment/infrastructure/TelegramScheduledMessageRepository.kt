package com.investment.infrastructure

import com.investment.api.dto.ScheduledMessageLogEntry
import com.investment.api.dto.ScheduledMessageRequest
import com.investment.api.dto.ScheduledMessageResponse
import org.jooq.DSLContext
import org.jooq.Record
import org.springframework.stereotype.Repository
import java.sql.Time
import java.sql.Timestamp
import java.time.Instant
import java.util.UUID

@Repository
class TelegramScheduledMessageRepository(private val dsl: DSLContext) {

    fun findAll(userId: UUID): List<ScheduledMessageResponse> {
        return dsl.fetch(
            "SELECT * FROM telegram_scheduled_messages WHERE user_id = ?::uuid ORDER BY created_at ASC",
            userId.toString()
        ).map { it.toResponse() }
    }

    fun findById(userId: UUID, id: UUID): ScheduledMessageResponse? {
        return dsl.fetchOne(
            "SELECT * FROM telegram_scheduled_messages WHERE id = ?::uuid AND user_id = ?::uuid",
            id.toString(),
            userId.toString()
        )?.toResponse()
    }

    fun findDue(): List<ScheduledMessageResponse> {
        return dsl.fetch(
            "SELECT * FROM upcoming_scheduled_messages ORDER BY next_send_at ASC"
        ).map { it.toResponse() }
    }

    fun insert(userId: UUID, request: ScheduledMessageRequest, nextSendAt: Instant): ScheduledMessageResponse {
        val id = UUID.randomUUID()
        val record = dsl.fetchOne(
            """
            INSERT INTO telegram_scheduled_messages (
                id, user_id, message_type, label, frequency,
                day_of_week, biweekly_week, day_of_month,
                send_time, is_active, next_send_at, send_count, created_at
            ) VALUES (
                ?::uuid, ?::uuid, ?::tg_message_type_enum, ?, ?::tg_frequency_enum,
                ?, ?, ?,
                ?::time, TRUE, ?, 0, NOW()
            )
            RETURNING *
            """.trimIndent(),
            id.toString(),
            userId.toString(),
            request.messageType.uppercase(),
            request.label,
            request.frequency.uppercase(),
            request.dayOfWeek,
            request.biweeklyWeek,
            request.dayOfMonth,
            request.sendTime,
            Timestamp.from(nextSendAt)
        ) ?: throw IllegalStateException("Insert into telegram_scheduled_messages returned no record")
        return record.toResponse()
    }

    fun update(userId: UUID, id: UUID, request: ScheduledMessageRequest, nextSendAt: Instant): ScheduledMessageResponse {
        val record = dsl.fetchOne(
            """
            UPDATE telegram_scheduled_messages SET
                message_type  = ?::tg_message_type_enum,
                label         = ?,
                frequency     = ?::tg_frequency_enum,
                day_of_week   = ?,
                biweekly_week = ?,
                day_of_month  = ?,
                send_time     = ?::time,
                next_send_at  = ?
            WHERE id = ?::uuid AND user_id = ?::uuid
            RETURNING *
            """.trimIndent(),
            request.messageType.uppercase(),
            request.label,
            request.frequency.uppercase(),
            request.dayOfWeek,
            request.biweeklyWeek,
            request.dayOfMonth,
            request.sendTime,
            Timestamp.from(nextSendAt),
            id.toString(),
            userId.toString()
        ) ?: throw NoSuchElementException("No scheduled message found with id $id")
        return record.toResponse()
    }

    fun toggle(userId: UUID, id: UUID, isActive: Boolean): ScheduledMessageResponse {
        val record = dsl.fetchOne(
            "UPDATE telegram_scheduled_messages SET is_active = ? WHERE id = ?::uuid AND user_id = ?::uuid RETURNING *",
            isActive,
            id.toString(),
            userId.toString()
        ) ?: throw NoSuchElementException("No scheduled message found with id $id")
        return record.toResponse()
    }

    fun updateAfterSend(id: UUID, nextSendAt: Instant) {
        dsl.execute(
            """
            UPDATE telegram_scheduled_messages SET
                last_sent_at = NOW(),
                next_send_at = ?,
                send_count   = send_count + 1
            WHERE id = ?::uuid
            """.trimIndent(),
            Timestamp.from(nextSendAt),
            id.toString()
        )
    }

    fun delete(userId: UUID, id: UUID) {
        val deleted = dsl.execute(
            "DELETE FROM telegram_scheduled_messages WHERE id = ?::uuid AND user_id = ?::uuid",
            id.toString(),
            userId.toString()
        )
        if (deleted == 0) throw NoSuchElementException("No scheduled message found with id $id")
    }

    fun logSend(
        scheduleId: UUID,
        status: String,
        errorMessage: String? = null,
        telegramMessageId: String? = null
    ) {
        val logId = UUID.randomUUID()
        dsl.execute(
            """
            INSERT INTO telegram_scheduled_message_log (id, schedule_id, sent_at, status, error_message, telegram_message_id)
            VALUES (?::uuid, ?::uuid, NOW(), ?, ?, ?)
            """.trimIndent(),
            logId.toString(),
            scheduleId.toString(),
            status,
            errorMessage,
            telegramMessageId
        )
    }

    fun getHistory(scheduleId: UUID): List<ScheduledMessageLogEntry> {
        return dsl.fetch(
            """
            SELECT * FROM telegram_scheduled_message_log
            WHERE schedule_id = ?::uuid
            ORDER BY sent_at DESC
            LIMIT 100
            """.trimIndent(),
            scheduleId.toString()
        ).map { record ->
            ScheduledMessageLogEntry(
                id           = UUID.fromString(record.get("id", String::class.java)),
                sentAt       = record.get("sent_at", Timestamp::class.java).toInstant(),
                status       = record.get("status", String::class.java),
                errorMessage = record.get("error_message", String::class.java),
                telegramMessageId = record.get("telegram_message_id", String::class.java)
            )
        }
    }

    private fun Record.toResponse(): ScheduledMessageResponse {
        val sendTimeRaw = get("send_time", Time::class.java)
        val sendTimeStr = sendTimeRaw.toLocalTime().let {
            "%02d:%02d".format(it.hour, it.minute)
        }
        val lastSentRaw = get("last_sent_at", Timestamp::class.java)
        return ScheduledMessageResponse(
            id           = UUID.fromString(get("id", String::class.java)),
            messageType  = get("message_type", String::class.java),
            label        = get("label", String::class.java),
            frequency    = get("frequency", String::class.java),
            dayOfWeek    = get("day_of_week", Integer::class.java)?.toInt(),
            biweeklyWeek = get("biweekly_week", Integer::class.java)?.toInt(),
            dayOfMonth   = get("day_of_month", Integer::class.java)?.toInt(),
            sendTime     = sendTimeStr,
            isActive     = get("is_active", Boolean::class.java),
            lastSentAt   = lastSentRaw?.toInstant(),
            nextSendAt   = get("next_send_at", Timestamp::class.java).toInstant(),
            sendCount    = get("send_count", Int::class.java),
            createdAt    = get("created_at", Timestamp::class.java).toInstant()
        )
    }
}
