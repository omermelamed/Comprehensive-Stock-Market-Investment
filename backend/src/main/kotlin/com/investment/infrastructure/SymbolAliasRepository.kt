package com.investment.infrastructure

import com.investment.api.dto.SymbolAliasResponse
import org.jooq.DSLContext
import org.jooq.Record
import org.springframework.stereotype.Repository
import java.sql.Timestamp
import java.util.UUID

@Repository
class SymbolAliasRepository(private val dsl: DSLContext) {

    fun findAll(): List<SymbolAliasResponse> {
        return dsl.fetch("SELECT * FROM symbol_aliases ORDER BY alias")
            .map { it.toResponse() }
    }

    fun findByAlias(alias: String): String? {
        val record = dsl.fetchOne(
            "SELECT yahoo_symbol FROM symbol_aliases WHERE UPPER(alias) = UPPER(?)",
            alias
        )
        return record?.get("yahoo_symbol", String::class.java)
    }

    fun upsert(alias: String, yahooSymbol: String): SymbolAliasResponse {
        val id = UUID.randomUUID()
        val record = dsl.fetchOne(
            """
            INSERT INTO symbol_aliases (id, alias, yahoo_symbol)
            VALUES (?::uuid, ?, ?)
            ON CONFLICT (UPPER(alias)) DO UPDATE SET yahoo_symbol = EXCLUDED.yahoo_symbol
            RETURNING *
            """.trimIndent(),
            id.toString(),
            alias.trim().uppercase(),
            yahooSymbol.trim()
        ) ?: throw IllegalStateException("Upsert into symbol_aliases returned no record")
        return record.toResponse()
    }

    fun delete(id: UUID) {
        val deleted = dsl.execute("DELETE FROM symbol_aliases WHERE id = ?::uuid", id.toString())
        if (deleted == 0) throw NoSuchElementException("Symbol alias not found: $id")
    }

    private fun Record.toResponse() = SymbolAliasResponse(
        id = UUID.fromString(get("id", String::class.java)),
        alias = get("alias", String::class.java),
        yahooSymbol = get("yahoo_symbol", String::class.java),
        createdAt = get("created_at", Timestamp::class.java).toInstant()
    )
}
