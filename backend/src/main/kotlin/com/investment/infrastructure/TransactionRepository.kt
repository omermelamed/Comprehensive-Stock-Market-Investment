package com.investment.infrastructure

import com.investment.api.dto.TransactionRequest
import com.investment.api.dto.TransactionResponse
import com.investment.domain.ParsedTransactionRow
import org.jooq.DSLContext
import org.jooq.Record
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.sql.Date
import java.sql.Timestamp
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.UUID

data class TransactionLedgerRow(
    val symbol: String,
    val type: String,
    val track: String,
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
            SELECT symbol, type, track, quantity, price_per_unit, executed_at
            FROM transactions
            ORDER BY executed_at ASC
            """.trimIndent()
        ).map { row ->
            TransactionLedgerRow(
                symbol = row.get("symbol", String::class.java),
                type = row.get("type", String::class.java),
                track = row.get("track", String::class.java),
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

    /**
     * Bulk-inserts a list of pre-validated [ParsedTransactionRow]s with source = 'IMPORT'.
     * [ParsedTransactionRow.transactionDate] is an ISO date string (yyyy-MM-dd); it is stored
     * as midnight UTC on that day so that holdings derivation treats it as an end-of-day event.
     * Returns the count of successfully inserted rows.
     */
    fun insertImport(rows: List<ParsedTransactionRow>): Int {
        var inserted = 0
        for (row in rows) {
            val id = UUID.randomUUID()
            // Parse the date and store as start-of-day UTC timestamp
            val executedAt = LocalDate.parse(row.transactionDate)
                .atStartOfDay(ZoneOffset.UTC)
                .toInstant()
            dsl.execute(
                """
                INSERT INTO transactions (id, symbol, type, track, quantity, price_per_unit, notes, executed_at, created_at, source)
                VALUES (?::uuid, ?, ?::transaction_type_enum, ?::track_enum, ?, ?, ?, ?, NOW(), 'IMPORT')
                """.trimIndent(),
                id.toString(),
                row.symbol.uppercase(),
                row.transactionType.uppercase(),
                row.track.uppercase(),
                BigDecimal(row.quantity),
                BigDecimal(row.pricePerUnit),
                row.notes,
                Timestamp.from(executedAt)
            )
            inserted++
        }
        return inserted
    }

    fun countByType(): Map<String, Int> {
        return dsl.fetch(
            "SELECT type, COUNT(*) AS cnt FROM transactions GROUP BY type"
        ).associate { record ->
            record.get("type", String::class.java) to record.get("cnt", Long::class.java).toInt()
        }
    }

    fun findEarliestTransactionDate(): LocalDate? {
        val record = dsl.fetchOne("SELECT MIN(executed_at::date) AS earliest_date FROM transactions")
        val date = record?.get("earliest_date", Date::class.java)
        return date?.toLocalDate()
    }

    fun findExecutedAtById(id: UUID): Instant? {
        val record = dsl.fetchOne(
            "SELECT executed_at FROM transactions WHERE id = ?::uuid",
            id.toString()
        )
        return record?.get("executed_at", Timestamp::class.java)?.toInstant()
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
