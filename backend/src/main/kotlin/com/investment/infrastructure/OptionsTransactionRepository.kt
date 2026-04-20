package com.investment.infrastructure

import com.investment.api.dto.OptionsTransactionResponse
import org.jooq.DSLContext
import org.jooq.Record
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.sql.Date
import java.time.LocalDate
import java.util.UUID

@Repository
class OptionsTransactionRepository(private val dsl: DSLContext) {

    fun findAll(userId: UUID): List<OptionsTransactionResponse> =
        dsl.fetch(
            "SELECT * FROM options_transactions WHERE user_id = ?::uuid ORDER BY executed_at DESC",
            userId.toString()
        ).map { it.toResponse(currentPremium = null) }

    fun findActive(userId: UUID): List<OptionsTransactionResponse> =
        dsl.fetch(
            """
            SELECT * FROM options_transactions
            WHERE user_id = ?::uuid AND status = 'ACTIVE'
            ORDER BY expiration_date ASC
            """.trimIndent(),
            userId.toString()
        ).map { it.toResponse(currentPremium = null) }

    fun insert(
        userId: UUID,
        underlyingSymbol: String,
        optionType: String,
        action: String,
        strikePrice: BigDecimal,
        expirationDate: LocalDate,
        contracts: Int,
        premiumPerContract: BigDecimal,
        notes: String?
    ): OptionsTransactionResponse {
        val record = dsl.fetchOne(
            """
            INSERT INTO options_transactions
                (user_id, underlying_symbol, option_type, action, strike_price, expiration_date,
                 contracts, premium_per_contract, notes)
            VALUES (?::uuid, ?, ?::option_type_enum, ?::option_action_enum, ?, ?, ?, ?, ?)
            RETURNING *
            """.trimIndent(),
            userId.toString(),
            underlyingSymbol.uppercase(),
            optionType.uppercase(),
            action.uppercase(),
            strikePrice,
            Date.valueOf(expirationDate),
            contracts,
            premiumPerContract,
            notes
        ) ?: throw IllegalStateException("Insert into options_transactions returned no record")

        return record.toResponse(currentPremium = null)
    }

    fun updateStatus(userId: UUID, id: UUID, status: String): OptionsTransactionResponse {
        val record = dsl.fetchOne(
            """
            UPDATE options_transactions
            SET status = ?::option_status_enum
            WHERE id = ?::uuid AND user_id = ?::uuid
            RETURNING *
            """.trimIndent(),
            status.uppercase(),
            id.toString(),
            userId.toString()
        ) ?: throw NoSuchElementException("No options transaction found with id $id")

        return record.toResponse(currentPremium = null)
    }

    fun delete(userId: UUID, id: UUID) {
        val deleted = dsl.execute(
            "DELETE FROM options_transactions WHERE id = ?::uuid AND user_id = ?::uuid",
            id.toString(),
            userId.toString()
        )
        if (deleted == 0) throw NoSuchElementException("No options transaction found with id $id")
    }

    fun findExpiringWithin(userId: UUID, days: Int): List<OptionsTransactionResponse> =
        dsl.fetch(
            """
            SELECT * FROM options_transactions
            WHERE user_id = ?::uuid
              AND status = 'ACTIVE'
              AND expiration_date <= CURRENT_DATE + ?::integer
            ORDER BY expiration_date ASC
            """.trimIndent(),
            userId.toString(),
            days
        ).map { it.toResponse(currentPremium = null) }

    private fun Record.toResponse(currentPremium: BigDecimal?): OptionsTransactionResponse {
        val expirationDate = get("expiration_date", Date::class.java).toLocalDate()
        val totalPremium = get("total_premium", BigDecimal::class.java)
        val action = get("action", String::class.java)
        val contracts = get("contracts", Integer::class.java).toInt()

        val pnl = if (currentPremium != null) {
            val multiplier = BigDecimal.valueOf(contracts.toLong() * 100)
            when (action.uppercase()) {
                "BUY"  -> (currentPremium - get("premium_per_contract", BigDecimal::class.java)) * multiplier
                "SELL" -> (get("premium_per_contract", BigDecimal::class.java) - currentPremium) * multiplier
                else   -> null
            }
        } else null

        val pnlPercent = if (pnl != null && totalPremium.compareTo(BigDecimal.ZERO) != 0) {
            pnl.divide(totalPremium, 4, java.math.RoundingMode.HALF_UP)
                .multiply(BigDecimal("100"))
                .setScale(2, java.math.RoundingMode.HALF_UP)
        } else null

        return OptionsTransactionResponse(
            id = UUID.fromString(get("id", String::class.java)),
            underlyingSymbol = get("underlying_symbol", String::class.java),
            optionType = get("option_type", String::class.java),
            action = action,
            strikePrice = get("strike_price", BigDecimal::class.java),
            expirationDate = expirationDate,
            contracts = contracts,
            premiumPerContract = get("premium_per_contract", BigDecimal::class.java),
            totalPremium = totalPremium,
            currentPremium = currentPremium,
            pnl = pnl,
            pnlPercent = pnlPercent,
            daysToExpiry = java.time.temporal.ChronoUnit.DAYS.between(
                java.time.LocalDate.now(), expirationDate
            ).toInt().coerceAtLeast(0),
            status = get("status", String::class.java),
            notes = get("notes", String::class.java),
            executedAt = get("executed_at", java.sql.Timestamp::class.java).toInstant(),
            createdAt = get("created_at", java.sql.Timestamp::class.java).toInstant()
        )
    }
}
