package com.investment.infrastructure

import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.util.UUID

data class UserRecord(
    val id: UUID,
    val email: String,
    val passwordHash: String,
    val emailVerified: Boolean
)

@Repository
class UserRepository(private val dsl: DSLContext) {

    fun findByEmail(email: String): UserRecord? {
        return dsl.fetchOne(
            "SELECT id, email, password_hash, email_verified FROM users WHERE LOWER(email) = LOWER(?)",
            email
        )?.let { r ->
            UserRecord(
                id = r.get("id", UUID::class.java),
                email = r.get("email", String::class.java),
                passwordHash = r.get("password_hash", String::class.java),
                emailVerified = r.get("email_verified", Boolean::class.java)
            )
        }
    }

    fun insert(email: String, passwordHash: String): UUID {
        val id = UUID.randomUUID()
        dsl.execute(
            "INSERT INTO users (id, email, password_hash, email_verified) VALUES (?::uuid, ?, ?, FALSE)",
            id.toString(), email, passwordHash
        )
        return id
    }

    fun setEmailVerified(userId: UUID) {
        dsl.execute(
            "UPDATE users SET email_verified = TRUE WHERE id = ?::uuid",
            userId.toString()
        )
    }

    fun updatePasswordHash(userId: UUID, passwordHash: String) {
        dsl.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?::uuid",
            passwordHash, userId.toString()
        )
    }

    fun findAllIds(): List<UUID> {
        return dsl.fetch("SELECT id FROM users")
            .map { it.get("id", UUID::class.java) }
    }

    fun findById(id: UUID): UserRecord? {
        return dsl.fetchOne(
            "SELECT id, email, password_hash, email_verified FROM users WHERE id = ?::uuid",
            id.toString()
        )?.let { r ->
            UserRecord(
                id = r.get("id", UUID::class.java),
                email = r.get("email", String::class.java),
                passwordHash = r.get("password_hash", String::class.java),
                emailVerified = r.get("email_verified", Boolean::class.java)
            )
        }
    }
}
