package com.investment.infrastructure

import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.util.UUID

data class TelegramConversationRecord(
    val id: UUID,
    val sessionId: UUID,
    val phoneNumber: String,
    val direction: String,
    val messageBody: String,
    val intent: String?,
    val intentData: String?,
    val telegramMessageId: String?,
    val createdAt: java.time.Instant
)

@Repository
class TelegramConversationRepository(private val dsl: DSLContext) {

    fun logMessage(
        sessionId: UUID,
        phoneNumber: String,
        direction: String,
        body: String,
        intent: String? = null,
        intentData: String? = null,
        telegramMessageId: String? = null
    ) {
        dsl.execute(
            """
            INSERT INTO telegram_conversations
                (session_id, phone_number, direction, message_body, intent, intent_data, telegram_message_id)
            VALUES (?::uuid, ?, ?, ?, ?, ?::jsonb, ?)
            """.trimIndent(),
            sessionId.toString(),
            phoneNumber,
            direction,
            body,
            intent,
            intentData,
            telegramMessageId
        )
    }

    fun recentMessages(sessionId: UUID, limit: Int = 10): List<TelegramConversationRecord> {
        return dsl.fetch(
            """
            SELECT id, session_id, phone_number, direction, message_body, intent, intent_data::text, telegram_message_id, created_at
            FROM telegram_conversations
            WHERE session_id = ?::uuid
            ORDER BY created_at DESC
            LIMIT ?
            """.trimIndent(),
            sessionId.toString(),
            limit
        ).map { r ->
            TelegramConversationRecord(
                id = UUID.fromString(r.get("id", String::class.java)),
                sessionId = UUID.fromString(r.get("session_id", String::class.java)),
                phoneNumber = r.get("phone_number", String::class.java),
                direction = r.get("direction", String::class.java),
                messageBody = r.get("message_body", String::class.java),
                intent = r.get("intent", String::class.java),
                intentData = r.get("intent_data", String::class.java),
                telegramMessageId = r.get("telegram_message_id", String::class.java),
                createdAt = r.get("created_at", java.sql.Timestamp::class.java).toInstant()
            )
        }
    }
}
