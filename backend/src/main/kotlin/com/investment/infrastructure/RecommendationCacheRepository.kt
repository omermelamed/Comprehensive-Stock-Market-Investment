package com.investment.infrastructure

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.investment.api.dto.RecommendationCard
import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.UUID

/**
 * Persists and retrieves cached recommendation payloads per user.
 * Uniqueness is enforced on `user_id` (upsert on conflict).
 * Portfolio context is not cached here — the service re-supplies it on read.
 */
@Repository
class RecommendationCacheRepository(
    private val dsl: DSLContext,
    private val objectMapper: ObjectMapper
) {

    data class CachedEntry(
        val recommendations: List<RecommendationCard>,
        val generatedAt: Instant,
        val expiresAt: Instant
    )

    /**
     * Returns the cached entry if it exists and has not expired. Returns null otherwise.
     */
    fun findFresh(userId: UUID): CachedEntry? {
        val record = dsl.fetchOne(
            "SELECT * FROM ai_recommendation_cache WHERE user_id = ?::uuid AND expires_at > NOW() LIMIT 1",
            userId
        ) ?: return null

        return try {
            val recommendationsJson = record.get("recommendations", String::class.java)
            val recommendations = objectMapper.readValue<List<RecommendationCard>>(recommendationsJson)
            val generatedAt = record.get("generated_at", java.sql.Timestamp::class.java).toInstant()
            val expiresAt = record.get("expires_at", java.sql.Timestamp::class.java).toInstant()
            CachedEntry(recommendations = recommendations, generatedAt = generatedAt, expiresAt = expiresAt)
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Upserts the recommendations list. Only the list is persisted; timestamps are driven by the DB defaults
     * for inserts and supplied explicitly for forced refreshes.
     */
    fun save(userId: UUID, recommendations: List<RecommendationCard>, generatedAt: Instant, expiresAt: Instant) {
        val recommendationsJson = objectMapper.writeValueAsString(recommendations)
        dsl.execute(
            """
            INSERT INTO ai_recommendation_cache (user_id, recommendations, generated_at, expires_at)
            VALUES (?::uuid, ?::jsonb, ?, ?)
            ON CONFLICT (user_id) DO UPDATE SET
                recommendations = EXCLUDED.recommendations,
                generated_at = EXCLUDED.generated_at,
                expires_at = EXCLUDED.expires_at
            """.trimIndent(),
            userId,
            recommendationsJson,
            java.sql.Timestamp.from(generatedAt),
            java.sql.Timestamp.from(expiresAt)
        )
    }
}
