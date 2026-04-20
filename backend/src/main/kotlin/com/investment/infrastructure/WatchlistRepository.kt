package com.investment.infrastructure

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.investment.api.dto.WatchlistItemResponse
import org.jooq.DSLContext
import org.jooq.Record
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.UUID

@Repository
class WatchlistRepository(
    private val dsl: DSLContext,
    private val objectMapper: ObjectMapper
) {

    fun findAll(userId: UUID): List<WatchlistItemResponse> {
        return dsl.fetch(
            "SELECT * FROM watchlist WHERE user_id = ?::uuid ORDER BY added_at DESC",
            userId.toString()
        ).map { it.toResponse() }
    }

    fun findById(userId: UUID, id: UUID): WatchlistItemResponse? {
        return dsl.fetchOne(
            "SELECT * FROM watchlist WHERE id = ?::uuid AND user_id = ?::uuid",
            id.toString(),
            userId.toString()
        )?.toResponse()
    }

    fun insert(userId: UUID, symbol: String, assetType: String): WatchlistItemResponse {
        val record = dsl.fetchOne(
            """
            INSERT INTO watchlist (id, user_id, symbol, asset_type)
            VALUES (gen_random_uuid(), ?::uuid, ?, ?::asset_type_enum)
            RETURNING *
            """.trimIndent(),
            userId.toString(),
            symbol.uppercase(),
            assetType.uppercase()
        ) ?: throw IllegalStateException("Insert into watchlist returned no record")

        return record.toResponse()
    }

    fun delete(userId: UUID, id: UUID) {
        val deleted = dsl.execute(
            "DELETE FROM watchlist WHERE id = ?::uuid AND user_id = ?::uuid",
            id.toString(),
            userId.toString()
        )
        if (deleted == 0) {
            throw NoSuchElementException("No watchlist item found with id $id")
        }
    }

    fun saveAnalysis(
        userId: UUID,
        id: UUID,
        signal: String,
        signalSummary: String,
        fullAnalysis: String
    ): WatchlistItemResponse {
        val record = dsl.fetchOne(
            """
            UPDATE watchlist SET
                signal = ?::watchlist_signal_enum,
                signal_summary = ?,
                full_analysis = ?::jsonb,
                last_analyzed_at = NOW(),
                updated_at = NOW()
            WHERE id = ?::uuid AND user_id = ?::uuid
            RETURNING *
            """.trimIndent(),
            signal,
            signalSummary,
            fullAnalysis,
            id.toString(),
            userId.toString()
        ) ?: throw NoSuchElementException("No watchlist item found with id $id")

        return record.toResponse()
    }

    @Suppress("UNCHECKED_CAST")
    private fun Record.toResponse(): WatchlistItemResponse {
        val fullAnalysisRaw = get("full_analysis", String::class.java)
        val fullAnalysisMap: Map<String, Any>? = if (fullAnalysisRaw != null) {
            try {
                objectMapper.readValue<Map<String, Any>>(fullAnalysisRaw)
            } catch (e: Exception) {
                null
            }
        } else {
            null
        }

        val lastAnalyzedRaw = get("last_analyzed_at", java.sql.Timestamp::class.java)

        val confidenceScore = (fullAnalysisMap?.get("confidenceScore") as? Number)?.toInt()

        return WatchlistItemResponse(
            id = UUID.fromString(get("id", String::class.java)),
            symbol = get("symbol", String::class.java),
            companyName = get("company_name", String::class.java),
            assetType = get("asset_type", String::class.java),
            signal = get("signal", String::class.java),
            signalSummary = get("signal_summary", String::class.java),
            fullAnalysis = fullAnalysisMap,
            confidenceScore = confidenceScore,
            lastAnalyzedAt = lastAnalyzedRaw?.toInstant(),
            addedAt = get("added_at", java.sql.Timestamp::class.java).toInstant()
        )
    }
}
