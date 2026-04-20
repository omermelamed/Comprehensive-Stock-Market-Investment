package com.investment.infrastructure

import com.investment.api.dto.RiskHistoryEntryResponse
import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.sql.Timestamp
import java.util.UUID

@Repository
class RiskScoreHistoryRepository(
    private val dsl: DSLContext
) {

    fun insert(
        userId: UUID,
        riskLevel: String,
        aiInferredScore: BigDecimal,
        reasoning: String,
        trigger: String,
        transactionCountAtUpdate: Int
    ): RiskHistoryEntryResponse {
        val record = dsl.fetchOne(
            """
            INSERT INTO risk_score_history (user_id, risk_level, ai_inferred_score, reasoning, trigger, transaction_count_at_update)
            VALUES (?::uuid, ?::risk_level_enum, ?, ?, ?::risk_score_trigger_enum, ?)
            RETURNING *
            """.trimIndent(),
            userId,
            riskLevel,
            aiInferredScore,
            reasoning,
            trigger,
            transactionCountAtUpdate
        ) ?: throw IllegalStateException("Insert into risk_score_history returned no record")

        return RiskHistoryEntryResponse(
            id = UUID.fromString(record.get("id", String::class.java)),
            riskLevel = record.get("risk_level", String::class.java),
            aiInferredScore = record.get("ai_inferred_score", BigDecimal::class.java),
            reasoning = record.get("reasoning", String::class.java),
            trigger = record.get("trigger", String::class.java),
            transactionCountAtUpdate = record.get("transaction_count_at_update", Int::class.java),
            createdAt = record.get("created_at", Timestamp::class.java).toInstant()
        )
    }

    fun findAllNewestFirst(userId: UUID): List<RiskHistoryEntryResponse> {
        return dsl.fetch(
            """
            SELECT id, risk_level, ai_inferred_score, reasoning, trigger, transaction_count_at_update, created_at
            FROM risk_score_history
            WHERE user_id = ?::uuid
            ORDER BY created_at DESC
            """.trimIndent(),
            userId
        ).map { record ->
            RiskHistoryEntryResponse(
                id = UUID.fromString(record.get("id", String::class.java)),
                riskLevel = record.get("risk_level", String::class.java),
                aiInferredScore = record.get("ai_inferred_score", BigDecimal::class.java),
                reasoning = record.get("reasoning", String::class.java),
                trigger = record.get("trigger", String::class.java),
                transactionCountAtUpdate = record.get("transaction_count_at_update", Int::class.java),
                createdAt = record.get("created_at", Timestamp::class.java).toInstant()
            )
        }
    }
}
