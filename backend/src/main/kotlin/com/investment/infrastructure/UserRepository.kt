package com.investment.infrastructure

import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.util.UUID

data class UserRecord(
    val id: UUID,
    val username: String,
    val passwordHash: String
)

@Repository
class UserRepository(private val dsl: DSLContext) {

    fun findByUsername(username: String): UserRecord? {
        return dsl.fetchOne(
            "SELECT id, username, password_hash FROM users WHERE username = ?",
            username
        )?.let { r ->
            UserRecord(
                id = r.get("id", UUID::class.java),
                username = r.get("username", String::class.java),
                passwordHash = r.get("password_hash", String::class.java)
            )
        }
    }

    fun insert(username: String, passwordHash: String): UUID {
        val id = UUID.randomUUID()
        dsl.execute(
            "INSERT INTO users (id, username, password_hash) VALUES (?::uuid, ?, ?)",
            id.toString(), username, passwordHash
        )
        return id
    }

    fun findAllIds(): List<UUID> {
        return dsl.fetch("SELECT id FROM users")
            .map { it.get("id", UUID::class.java) }
    }

    fun findById(id: UUID): UserRecord? {
        return dsl.fetchOne(
            "SELECT id, username, password_hash FROM users WHERE id = ?::uuid",
            id.toString()
        )?.let { r ->
            UserRecord(
                id = r.get("id", UUID::class.java),
                username = r.get("username", String::class.java),
                passwordHash = r.get("password_hash", String::class.java)
            )
        }
    }
}
