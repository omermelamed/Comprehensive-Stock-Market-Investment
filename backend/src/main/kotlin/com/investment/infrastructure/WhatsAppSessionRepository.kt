package com.investment.infrastructure

import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class WhatsAppSessionRepository(private val dsl: DSLContext) {

    /**
     * Returns the active session UUID for a phone number if a conversation row exists
     * within the last 30 minutes; otherwise generates a new UUID representing a new session.
     */
    fun resolveSession(phoneNumber: String): UUID {
        val row = dsl.fetchOne(
            """
            SELECT session_id
            FROM whatsapp_conversations
            WHERE phone_number = ?
              AND created_at > NOW() - INTERVAL '30 minutes'
            ORDER BY created_at DESC
            LIMIT 1
            """.trimIndent(),
            phoneNumber
        )
        return if (row != null) {
            UUID.fromString(row.get("session_id", String::class.java))
        } else {
            UUID.randomUUID()
        }
    }
}
