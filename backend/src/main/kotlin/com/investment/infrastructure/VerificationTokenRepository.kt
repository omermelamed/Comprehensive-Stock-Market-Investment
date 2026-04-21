package com.investment.infrastructure

import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.time.LocalDateTime
import java.util.UUID

data class VerificationTokenRecord(
    val id: UUID,
    val userId: UUID,
    val token: String,
    val tokenType: String,
    val expiresAt: LocalDateTime,
    val createdAt: LocalDateTime
)

@Repository
class VerificationTokenRepository(private val dsl: DSLContext) {

    fun insert(userId: UUID, token: String, tokenType: String, expiresAt: LocalDateTime): UUID {
        val id = UUID.randomUUID()
        dsl.execute(
            """INSERT INTO verification_tokens (id, user_id, token, token_type, expires_at)
               VALUES (?::uuid, ?::uuid, ?, ?, ?)""",
            id.toString(), userId.toString(), token, tokenType, expiresAt
        )
        return id
    }

    fun findByToken(token: String): VerificationTokenRecord? {
        return dsl.fetchOne(
            """SELECT id, user_id, token, token_type, expires_at, created_at
               FROM verification_tokens WHERE token = ?""",
            token
        )?.let { r ->
            VerificationTokenRecord(
                id = r.get("id", UUID::class.java),
                userId = r.get("user_id", UUID::class.java),
                token = r.get("token", String::class.java),
                tokenType = r.get("token_type", String::class.java),
                expiresAt = r.get("expires_at", LocalDateTime::class.java),
                createdAt = r.get("created_at", LocalDateTime::class.java)
            )
        }
    }

    fun deleteByToken(token: String) {
        dsl.execute("DELETE FROM verification_tokens WHERE token = ?", token)
    }

    fun deleteByUserIdAndType(userId: UUID, tokenType: String) {
        dsl.execute(
            "DELETE FROM verification_tokens WHERE user_id = ?::uuid AND token_type = ?",
            userId.toString(), tokenType
        )
    }

    fun findLatestByUserIdAndType(userId: UUID, tokenType: String): VerificationTokenRecord? {
        return dsl.fetchOne(
            """SELECT id, user_id, token, token_type, expires_at, created_at
               FROM verification_tokens
               WHERE user_id = ?::uuid AND token_type = ?
               ORDER BY created_at DESC LIMIT 1""",
            userId.toString(), tokenType
        )?.let { r ->
            VerificationTokenRecord(
                id = r.get("id", UUID::class.java),
                userId = r.get("user_id", UUID::class.java),
                token = r.get("token", String::class.java),
                tokenType = r.get("token_type", String::class.java),
                expiresAt = r.get("expires_at", LocalDateTime::class.java),
                createdAt = r.get("created_at", LocalDateTime::class.java)
            )
        }
    }

    fun deleteExpired() {
        dsl.execute("DELETE FROM verification_tokens WHERE expires_at < NOW()")
    }
}
