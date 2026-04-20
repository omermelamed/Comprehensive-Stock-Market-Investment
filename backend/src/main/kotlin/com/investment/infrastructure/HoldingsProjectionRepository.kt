package com.investment.infrastructure

import com.investment.api.dto.HoldingResponse
import org.jooq.DSLContext
import org.jooq.Record
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.sql.Timestamp
import java.util.UUID

@Repository
class HoldingsProjectionRepository(
    private val dsl: DSLContext
) {

    fun findAll(userId: UUID): List<HoldingResponse> {
        return dsl.fetch(
            "SELECT * FROM current_holdings WHERE user_id = ?::uuid ORDER BY symbol, track",
            userId.toString()
        ).map { it.toResponse() }
    }

    fun findBySymbolAndTrack(userId: UUID, symbol: String, track: String): BigDecimal {
        val record = dsl.fetchOne(
            "SELECT net_quantity FROM current_holdings WHERE user_id = ?::uuid AND UPPER(symbol) = UPPER(?) AND track = ?::track_enum",
            userId.toString(),
            symbol,
            track.uppercase()
        )
        return record?.get("net_quantity", BigDecimal::class.java) ?: BigDecimal.ZERO
    }

    private fun Record.toResponse(): HoldingResponse {
        return HoldingResponse(
            symbol = get("symbol", String::class.java),
            track = get("track", String::class.java),
            netQuantity = get("net_quantity", BigDecimal::class.java),
            avgBuyPrice = get("avg_buy_price", BigDecimal::class.java) ?: BigDecimal.ZERO,
            totalCostBasis = get("total_cost_basis", BigDecimal::class.java) ?: BigDecimal.ZERO,
            transactionCount = get("transaction_count", Long::class.java).toInt(),
            firstBoughtAt = get("first_bought_at", Timestamp::class.java).toInstant(),
            lastTransactionAt = get("last_transaction_at", Timestamp::class.java).toInstant()
        )
    }
}
