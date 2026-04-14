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
class WhatsAppScheduledMessageRepository(private val dsl: DSLContext) {

    fun findAll(): List<ScheduledMessageResponse> {
        return dsl.fetch(
            "SELECT * FROM whatsapp_scheduled_messages ORDER BY created_at ASC"
        ).map { it.toResponse() }
    }

    fun findById(id: UUID): ScheduledMessageResponse? {
        return dsl.fetchOne(
            "SELECT * FROM whatsapp_scheduled_messages WHERE id = ?::uuid",
            id.toString()
        )?.toResponse()
    }

    /** Returns all schedules whose next_send_at has passed and are still active. */
    fun findDue(): List<ScheduledMessageResponse> {
        return dsl.fetch(
            "SELECT * FROM upcoming_scheduled_messages ORDER BY next_send_at ASC"
        ).map { it.toResponse() }
    }

    fun insert(request: ScheduledMessageRequest, nextSendAt: Instant): ScheduledMessageResponse {
        val id = UUID.randomUUID()
        val record = dsl.fetchOne(
            """
            INSERT INTO whatsapp_scheduled_messages (
                id, message_type, label, frequency,
                day_of_week, biweekly_week, day_of_month,
                send_time, is_active, next_send_at, send_count, created_at
            ) VALUES (
                ?::uuid, ?::wa_message_type_enum, ?, ?::wa_frequency_enum,
                ?, ?, ?,
                ?::time, TRUE, ?, 0, NOW()
            )
            RETURNING *
            """.trimIndent(),
            id.toString(),
            request.messageType.uppercase(),
            request.label,
            request.frequency.uppercase(),
            request.dayOfWeek,
            request.biweeklyWeek,
            request.dayOfMonth,
            request.sendTime,
            Timestamp.from(nextSendAt)
        ) ?: throw IllegalStateException("Insert into whatsapp_scheduled_messages returned no record")
        return record.toResponse()
    }

    fun update(id: UUID, request: ScheduledMessageRequest, nextSendAt: Instant): ScheduledMessageResponse {
        val record = dsl.fetchOne(
            """
            UPDATE whatsapp_scheduled_messages SET
                message_type  = ?::wa_message_type_enum,
                label         = ?,
                frequency     = ?::wa_frequency_enum,
                day_of_week   = ?,
                biweekly_week = ?,
                day_of_month  = ?,
                send_time     = ?::time,
                next_send_at  = ?
            WHERE id = ?::uuid
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
            id.toString()
        ) ?: throw NoSuchElementException("No scheduled message found with id $id")
        return record.toResponse()
    }

    fun toggle(id: UUID, isActive: Boolean): ScheduledMessageResponse {
        val record = dsl.fetchOne(
            "UPDATE whatsapp_scheduled_messages SET is_active = ? WHERE id = ?::uuid RETURNING *",
            isActive,
            id.toString()
        ) ?: throw NoSuchElementException("No scheduled message found with id $id")
        return record.toResponse()
    }

    /** Called after a successful send: bumps send_count, sets last_sent_at, updates next_send_at. */
    fun updateAfterSend(id: UUID, nextSendAt: Instant) {
        dsl.execute(
            """
            UPDATE whatsapp_scheduled_messages SET
                last_sent_at = NOW(),
                next_send_at = ?,
                send_count   = send_count + 1
            WHERE id = ?::uuid
            """.trimIndent(),
            Timestamp.from(nextSendAt),
            id.toString()
        )
    }

    fun delete(id: UUID) {
        val deleted = dsl.execute(
            "DELETE FROM whatsapp_scheduled_messages WHERE id = ?::uuid",
            id.toString()
        )
        if (deleted == 0) throw NoSuchElementException("No scheduled message found with id $id")
    }

    fun logSend(
        scheduleId: UUID,
        status: String,
        errorMessage: String? = null,
        twilioSid: String? = null
    ) {
        val logId = UUID.randomUUID()
        dsl.execute(
            """
            INSERT INTO whatsapp_scheduled_message_log (id, schedule_id, sent_at, status, error_message, twilio_sid)
            VALUES (?::uuid, ?::uuid, NOW(), ?, ?, ?)
            """.trimIndent(),
            logId.toString(),
            scheduleId.toString(),
            status,
            errorMessage,
            twilioSid
        )
    }

    fun getHistory(scheduleId: UUID): List<ScheduledMessageLogEntry> {
        return dsl.fetch(
            """
            SELECT * FROM whatsapp_scheduled_message_log
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
                twilioSid    = record.get("twilio_sid", String::class.java)
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
