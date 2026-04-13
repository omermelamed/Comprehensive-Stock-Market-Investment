package com.investment.infrastructure

import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.util.UUID

data class PendingConfirmation(
    val id: UUID,
    val sessionId: UUID,
    val intent: String,
    val intentData: String,
    val confirmationMessage: String,
    val state: String,
    val expiresAt: java.time.Instant,
    val createdAt: java.time.Instant
)

@Repository
class WhatsAppPendingConfirmationRepository(private val dsl: DSLContext) {

    fun savePending(
        sessionId: UUID,
        intent: String,
        intentDataJson: String,
        confirmationMessage: String
    ): UUID {
        val id = UUID.randomUUID()
        dsl.execute(
            """
            INSERT INTO whatsapp_pending_confirmations
                (id, session_id, intent, intent_data, confirmation_message, expires_at)
            VALUES (?::uuid, ?::uuid, ?, ?::jsonb, ?, NOW() + INTERVAL '5 minutes')
            """.trimIndent(),
            id.toString(),
            sessionId.toString(),
            intent,
            intentDataJson,
            confirmationMessage
        )
        return id
    }

    fun findOpenConfirmation(sessionId: UUID): PendingConfirmation? {
        val row = dsl.fetchOne(
            """
            SELECT id, session_id, intent, intent_data::text, confirmation_message, state, expires_at, created_at
            FROM whatsapp_pending_confirmations
            WHERE session_id = ?::uuid
              AND resolved = FALSE
              AND expires_at > NOW()
            ORDER BY created_at DESC
            LIMIT 1
            """.trimIndent(),
            sessionId.toString()
        ) ?: return null

        return PendingConfirmation(
            id = UUID.fromString(row.get("id", String::class.java)),
            sessionId = UUID.fromString(row.get("session_id", String::class.java)),
            intent = row.get("intent", String::class.java),
            intentData = row.get("intent_data", String::class.java),
            confirmationMessage = row.get("confirmation_message", String::class.java),
            state = row.get("state", String::class.java),
            expiresAt = row.get("expires_at", java.sql.Timestamp::class.java).toInstant(),
            createdAt = row.get("created_at", java.sql.Timestamp::class.java).toInstant()
        )
    }

    fun resolve(id: UUID, resolution: String) {
        dsl.execute(
            """
            UPDATE whatsapp_pending_confirmations
            SET resolved = TRUE, resolution = ?, state = 'RESOLVED'
            WHERE id = ?::uuid
            """.trimIndent(),
            resolution,
            id.toString()
        )
    }

    fun expireStale() {
        dsl.execute(
            """
            UPDATE whatsapp_pending_confirmations
            SET resolved = TRUE, resolution = 'EXPIRED', state = 'RESOLVED'
            WHERE resolved = FALSE
              AND expires_at <= NOW()
            """
        )
    }
}
