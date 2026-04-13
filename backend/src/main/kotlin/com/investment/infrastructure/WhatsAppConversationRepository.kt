package com.investment.infrastructure

import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.util.UUID

data class WhatsAppConversationRecord(
    val id: UUID,
    val sessionId: UUID,
    val phoneNumber: String,
    val direction: String,
    val messageBody: String,
    val intent: String?,
    val intentData: String?,
    val twilioSid: String?,
    val createdAt: java.time.Instant
)

@Repository
class WhatsAppConversationRepository(private val dsl: DSLContext) {

    fun logMessage(
        sessionId: UUID,
        phoneNumber: String,
        direction: String,
        body: String,
        intent: String? = null,
        intentData: String? = null,
        twilioSid: String? = null
    ) {
        dsl.execute(
            """
            INSERT INTO whatsapp_conversations
                (session_id, phone_number, direction, message_body, intent, intent_data, twilio_sid)
            VALUES (?::uuid, ?, ?, ?, ?, ?::jsonb, ?)
            """.trimIndent(),
            sessionId.toString(),
            phoneNumber,
            direction,
            body,
            intent,
            intentData,
            twilioSid
        )
    }

    fun recentMessages(sessionId: UUID, limit: Int = 10): List<WhatsAppConversationRecord> {
        return dsl.fetch(
            """
            SELECT id, session_id, phone_number, direction, message_body, intent, intent_data::text, twilio_sid, created_at
            FROM whatsapp_conversations
            WHERE session_id = ?::uuid
            ORDER BY created_at DESC
            LIMIT ?
            """.trimIndent(),
            sessionId.toString(),
            limit
        ).map { r ->
            WhatsAppConversationRecord(
                id = UUID.fromString(r.get("id", String::class.java)),
                sessionId = UUID.fromString(r.get("session_id", String::class.java)),
                phoneNumber = r.get("phone_number", String::class.java),
                direction = r.get("direction", String::class.java),
                messageBody = r.get("message_body", String::class.java),
                intent = r.get("intent", String::class.java),
                intentData = r.get("intent_data", String::class.java),
                twilioSid = r.get("twilio_sid", String::class.java),
                createdAt = r.get("created_at", java.sql.Timestamp::class.java).toInstant()
            )
        }
    }
}
