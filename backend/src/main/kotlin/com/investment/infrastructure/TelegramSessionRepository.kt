package com.investment.infrastructure

import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class TelegramSessionRepository(private val dsl: DSLContext) {

    /**
     * Returns the active session UUID for a chat ID if a conversation row exists
     * within the last 30 minutes; otherwise generates a new UUID representing a new session.
     */
    fun resolveSession(chatId: String): UUID {
        val row = dsl.fetchOne(
            """
            SELECT session_id
            FROM telegram_conversations
            WHERE phone_number = ?
              AND created_at > NOW() - INTERVAL '30 minutes'
            ORDER BY created_at DESC
            LIMIT 1
            """.trimIndent(),
            chatId
        )
        return if (row != null) {
            UUID.fromString(row.get("session_id", String::class.java))
        } else {
            UUID.randomUUID()
        }
    }
}
