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
    val fees: BigDecimal,
    val executedAt: Instant
)

@Repository
class TransactionRepository(
    private val dsl: DSLContext
) {

    fun findAllOrderedByExecutedAtAsc(userId: UUID): List<TransactionLedgerRow> {
        return dsl.fetch(
            """
            SELECT symbol, type, track, quantity, price_per_unit, fees, executed_at
            FROM transactions
            WHERE user_id = ?::uuid
            ORDER BY executed_at ASC
            """.trimIndent(),
            userId.toString()
        ).map { row ->
            TransactionLedgerRow(
                symbol = row.get("symbol", String::class.java),
                type = row.get("type", String::class.java),
                track = row.get("track", String::class.java),
                quantity = row.get("quantity", BigDecimal::class.java),
                pricePerUnit = row.get("price_per_unit", BigDecimal::class.java),
                fees = row.get("fees", BigDecimal::class.java),
                executedAt = row.get("executed_at", Timestamp::class.java).toInstant()
            )
        }
    }

    fun findAll(userId: UUID, page: Int, size: Int): List<TransactionResponse> {
        val offset = page * size
        return dsl.fetch(
            """
            SELECT * FROM transactions
            WHERE user_id = ?::uuid
            ORDER BY executed_at DESC
            LIMIT ? OFFSET ?
            """.trimIndent(),
            userId.toString(),
            size,
            offset
        ).map { it.toResponse() }
    }

    fun count(userId: UUID): Long {
        return dsl.fetchOne(
            "SELECT COUNT(*) FROM transactions WHERE user_id = ?::uuid",
            userId.toString()
        )?.get(0, Long::class.java) ?: 0L
    }

    fun insert(userId: UUID, request: TransactionRequest): TransactionResponse {
        val id = UUID.randomUUID()
        val record = dsl.fetchOne(
            """
            INSERT INTO transactions (id, user_id, symbol, type, track, quantity, price_per_unit, fees, notes, executed_at, created_at)
            VALUES (?::uuid, ?::uuid, ?, ?::transaction_type_enum, ?::track_enum, ?, ?, ?, ?, ?, NOW())
            RETURNING *
            """.trimIndent(),
            id.toString(),
            userId.toString(),
            request.symbol.uppercase(),
            request.type.uppercase(),
            request.track.uppercase(),
            request.quantity,
            request.pricePerUnit,
            request.fees,
            request.notes,
            Timestamp.from(request.executedAt)
        ) ?: throw IllegalStateException("Insert into transactions returned no record")

        return record.toResponse()
    }

    fun insertImport(userId: UUID, rows: List<ParsedTransactionRow>): Int {
        var inserted = 0
        for (row in rows) {
            val id = UUID.randomUUID()
            val executedAt = LocalDate.parse(row.transactionDate)
                .atStartOfDay(ZoneOffset.UTC)
                .toInstant()
            dsl.execute(
                """
                INSERT INTO transactions (id, user_id, symbol, type, track, quantity, price_per_unit, fees, notes, executed_at, created_at, source)
                VALUES (?::uuid, ?::uuid, ?, ?::transaction_type_enum, ?::track_enum, ?, ?, ?, ?, ?, NOW(), 'IMPORT')
                """.trimIndent(),
                id.toString(),
                userId.toString(),
                row.symbol.uppercase(),
                row.transactionType.uppercase(),
                row.track.uppercase(),
                BigDecimal(row.quantity),
                BigDecimal(row.pricePerUnit),
                BigDecimal(row.fees),
                row.notes,
                Timestamp.from(executedAt)
            )
            inserted++
        }
        return inserted
    }

    fun countByType(userId: UUID): Map<String, Int> {
        return dsl.fetch(
            "SELECT type, COUNT(*) AS cnt FROM transactions WHERE user_id = ?::uuid GROUP BY type",
            userId.toString()
        ).associate { record ->
            record.get("type", String::class.java) to record.get("cnt", Long::class.java).toInt()
        }
    }

    fun findEarliestTransactionDate(userId: UUID): LocalDate? {
        val record = dsl.fetchOne(
            "SELECT MIN(executed_at::date) AS earliest_date FROM transactions WHERE user_id = ?::uuid",
            userId.toString()
        )
        val date = record?.get("earliest_date", Date::class.java)
        return date?.toLocalDate()
    }

    fun findExecutedAtById(userId: UUID, id: UUID): Instant? {
        val record = dsl.fetchOne(
            "SELECT executed_at FROM transactions WHERE id = ?::uuid AND user_id = ?::uuid",
            id.toString(),
            userId.toString()
        )
        return record?.get("executed_at", Timestamp::class.java)?.toInstant()
    }

    fun update(userId: UUID, id: UUID, request: TransactionRequest): TransactionResponse {
        val record = dsl.fetchOne(
            """
            UPDATE transactions
            SET symbol = ?, type = ?::transaction_type_enum, track = ?::track_enum,
                quantity = ?, price_per_unit = ?, fees = ?, notes = ?, executed_at = ?
            WHERE id = ?::uuid AND user_id = ?::uuid
            RETURNING *
            """.trimIndent(),
            request.symbol.uppercase(),
            request.type.uppercase(),
            request.track.uppercase(),
            request.quantity,
            request.pricePerUnit,
            request.fees,
            request.notes,
            Timestamp.from(request.executedAt),
            id.toString(),
            userId.toString()
        ) ?: throw NoSuchElementException("No transaction found with id $id")
        return record.toResponse()
    }

    fun delete(userId: UUID, id: UUID) {
        val deleted = dsl.execute(
            "DELETE FROM transactions WHERE id = ?::uuid AND user_id = ?::uuid",
            id.toString(),
            userId.toString()
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
            fees = get("fees", BigDecimal::class.java),
            notes = get("notes", String::class.java),
            executedAt = get("executed_at", Timestamp::class.java).toInstant(),
            createdAt = get("created_at", Timestamp::class.java).toInstant()
        )
    }
}
