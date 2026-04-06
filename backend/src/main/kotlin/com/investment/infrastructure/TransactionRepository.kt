package com.investment.infrastructure

import com.investment.api.dto.TransactionRequest
import com.investment.api.dto.TransactionResponse
import org.jooq.DSLContext
import org.jooq.Record
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.sql.Date
import java.sql.Timestamp
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

data class TransactionLedgerRow(
    val symbol: String,
    val type: String,
    val quantity: BigDecimal,
    val pricePerUnit: BigDecimal,
    val executedAt: Instant
)

@Repository
class TransactionRepository(
    private val dsl: DSLContext
) {

    fun findAllOrderedByExecutedAtAsc(): List<TransactionLedgerRow> {
        return dsl.fetch(
            """
            SELECT symbol, type, quantity, price_per_unit, executed_at
            FROM transactions
            ORDER BY executed_at ASC
            """.trimIndent()
        ).map { row ->
            TransactionLedgerRow(
                symbol = row.get("symbol", String::class.java),
                type = row.get("type", String::class.java),
                quantity = row.get("quantity", BigDecimal::class.java),
                pricePerUnit = row.get("price_per_unit", BigDecimal::class.java),
                executedAt = row.get("executed_at", Timestamp::class.java).toInstant()
            )
        }
    }

    fun findAll(page: Int, size: Int): List<TransactionResponse> {
        val offset = page * size
        return dsl.fetch(
            """
            SELECT * FROM transactions
            ORDER BY executed_at DESC
            LIMIT ? OFFSET ?
            """.trimIndent(),
            size,
            offset
        ).map { it.toResponse() }
    }

    fun count(): Long {
        return dsl.fetchOne("SELECT COUNT(*) FROM transactions")
            ?.get(0, Long::class.java) ?: 0L
    }

    fun insert(request: TransactionRequest): TransactionResponse {
        val id = UUID.randomUUID()
        val record = dsl.fetchOne(
            """
            INSERT INTO transactions (id, symbol, type, track, quantity, price_per_unit, notes, executed_at, created_at)
            VALUES (?::uuid, ?, ?::transaction_type_enum, ?::track_enum, ?, ?, ?, ?, NOW())
            RETURNING *
            """.trimIndent(),
            id.toString(),
            request.symbol.uppercase(),
            request.type.uppercase(),
            request.track.uppercase(),
            request.quantity,
            request.pricePerUnit,
            request.notes,
            Timestamp.from(request.executedAt)
        ) ?: throw IllegalStateException("Insert into transactions returned no record")

        return record.toResponse()
    }

    fun findEarliestTransactionDate(): LocalDate? {
        val record = dsl.fetchOne("SELECT MIN(executed_at::date) AS earliest_date FROM transactions")
        val date = record?.get("earliest_date", Date::class.java)
        return date?.toLocalDate()
    }

    fun delete(id: UUID) {
        val deleted = dsl.execute(
            "DELETE FROM transactions WHERE id = ?::uuid",
            id.toString()
        )
        if (deleted == 0) {
            throw NoSuchElementException("No transaction found with id $id")
        }
    }

    private fun Record.toResponse(): TransactionResponse {
        return TransactionResponse(
            id = UUID.fromString(get("id", String::class.java)),
            symbol = get("symbol", String::class.java),
            type = get("type", String::class.java),
            track = get("track", String::class.java),
            quantity = get("quantity", BigDecimal::class.java),
            pricePerUnit = get("price_per_unit", BigDecimal::class.java),
            totalValue = get("total_value", BigDecimal::class.java),
            notes = get("notes", String::class.java),
            executedAt = get("executed_at", Timestamp::class.java).toInstant(),
            createdAt = get("created_at", Timestamp::class.java).toInstant()
        )
    }
}
