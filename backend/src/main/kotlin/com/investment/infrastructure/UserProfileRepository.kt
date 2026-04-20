package com.investment.infrastructure

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.investment.api.dto.UserProfileRequest
import com.investment.api.dto.UserProfileResponse
import org.jooq.DSLContext
import org.jooq.Record
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.util.UUID

@Repository
class UserProfileRepository(
    private val dsl: DSLContext,
    private val objectMapper: ObjectMapper
) {

    fun findByUserId(userId: UUID): UserProfileResponse? {
        val record = dsl.fetchOne("SELECT * FROM user_profile WHERE user_id = ?::uuid", userId.toString())
        return record?.toResponse()
    }

    fun upsert(userId: UUID, request: UserProfileRequest, riskLevel: String): UserProfileResponse {
        val id = UUID.randomUUID()
        val tracksJson = objectMapper.writeValueAsString(request.tracksEnabled)
        val answersJson = objectMapper.writeValueAsString(request.questionnaireAnswers)

        val record = dsl.fetchOne(
            """
            INSERT INTO user_profile (
                id, user_id, display_name, preferred_currency, risk_level,
                time_horizon_years, monthly_investment_min, monthly_investment_max,
                investment_goal, tracks_enabled, questionnaire_answers, theme,
                telegram_chat_id, telegram_enabled, timezone, onboarding_completed, created_at, last_updated
            ) VALUES (
                ?::uuid, ?::uuid, ?, ?, ?::risk_level_enum,
                ?, ?, ?,
                ?, ?::jsonb, ?::jsonb, ?,
                ?, ?, ?, false, NOW(), NOW()
            )
            ON CONFLICT (user_id) DO UPDATE SET
                display_name = EXCLUDED.display_name,
                preferred_currency = EXCLUDED.preferred_currency,
                risk_level = EXCLUDED.risk_level,
                time_horizon_years = EXCLUDED.time_horizon_years,
                monthly_investment_min = EXCLUDED.monthly_investment_min,
                monthly_investment_max = EXCLUDED.monthly_investment_max,
                investment_goal = EXCLUDED.investment_goal,
                tracks_enabled = EXCLUDED.tracks_enabled,
                questionnaire_answers = EXCLUDED.questionnaire_answers,
                theme = EXCLUDED.theme,
                telegram_chat_id = EXCLUDED.telegram_chat_id,
                telegram_enabled = EXCLUDED.telegram_enabled,
                timezone = EXCLUDED.timezone,
                last_updated = NOW()
            RETURNING *
            """.trimIndent(),
            id.toString(), userId.toString(),
            request.displayName, request.preferredCurrency, riskLevel,
            request.timeHorizonYears, request.monthlyInvestmentMin, request.monthlyInvestmentMax,
            request.investmentGoal, tracksJson, answersJson, request.theme,
            request.telegramChatId, request.telegramEnabled, request.timezone
        ) ?: throw IllegalStateException("Upsert into user_profile returned no record")

        return record.toResponse()
    }

    fun update(userId: UUID, request: UserProfileRequest, riskLevel: String): UserProfileResponse {
        val tracksJson = objectMapper.writeValueAsString(request.tracksEnabled)
        val answersJson = objectMapper.writeValueAsString(request.questionnaireAnswers)

        val record = dsl.fetchOne(
            """
            UPDATE user_profile SET
                display_name = ?,
                preferred_currency = ?,
                risk_level = ?::risk_level_enum,
                time_horizon_years = ?,
                monthly_investment_min = ?,
                monthly_investment_max = ?,
                investment_goal = ?,
                tracks_enabled = ?::jsonb,
                questionnaire_answers = ?::jsonb,
                theme = ?,
                telegram_chat_id = ?,
                telegram_enabled = ?,
                timezone = ?
            WHERE user_id = ?::uuid
            RETURNING *
            """.trimIndent(),
            request.displayName, request.preferredCurrency, riskLevel,
            request.timeHorizonYears, request.monthlyInvestmentMin, request.monthlyInvestmentMax,
            request.investmentGoal, tracksJson, answersJson, request.theme,
            request.telegramChatId, request.telegramEnabled, request.timezone,
            userId.toString()
        ) ?: throw NoSuchElementException("No user profile found for user $userId")

        return record.toResponse()
    }

    fun setOnboardingCompleted(userId: UUID): UserProfileResponse {
        val record = dsl.fetchOne(
            "UPDATE user_profile SET onboarding_completed = true WHERE user_id = ?::uuid RETURNING *",
            userId.toString()
        ) ?: throw NoSuchElementException("No user profile found for user $userId")
        return record.toResponse()
    }

    fun findTimezone(userId: UUID): String? {
        return dsl.fetchOne(
            "SELECT timezone FROM user_profile WHERE user_id = ?::uuid",
            userId.toString()
        )?.get("timezone", String::class.java)
    }

    /** Alias used by scheduler context that already has a resolved userId. */
    fun findProfile(userId: UUID) = findByUserId(userId)

    fun linkTelegramChat(userId: UUID, chatId: String) {
        dsl.execute(
            "UPDATE user_profile SET telegram_chat_id = ?, telegram_enabled = true, last_updated = NOW() WHERE user_id = ?::uuid",
            chatId, userId.toString()
        )
    }

    fun updateRiskScore(userId: UUID, riskLevel: String, aiInferredScore: BigDecimal) {
        dsl.execute(
            "UPDATE user_profile SET risk_level = ?::risk_level_enum, ai_inferred_score = ?, last_updated = NOW() WHERE user_id = ?::uuid",
            riskLevel, aiInferredScore, userId.toString()
        )
    }

    private fun Record.toResponse(): UserProfileResponse {
        val tracksJson = get("tracks_enabled")?.toString() ?: "[]"
        val answersJson = get("questionnaire_answers")?.toString() ?: "{}"
        val tracks: List<String> = objectMapper.readValue(tracksJson)
        val answers: Map<String, Any> = objectMapper.readValue(answersJson)

        return UserProfileResponse(
            id = get("id", UUID::class.java),
            displayName = get("display_name", String::class.java),
            preferredCurrency = get("preferred_currency", String::class.java),
            riskLevel = get("risk_level", String::class.java),
            timeHorizonYears = get("time_horizon_years", Int::class.java),
            monthlyInvestmentMin = get("monthly_investment_min", BigDecimal::class.java),
            monthlyInvestmentMax = get("monthly_investment_max", BigDecimal::class.java),
            investmentGoal = get("investment_goal", String::class.java),
            tracksEnabled = tracks,
            questionnaireAnswers = answers,
            aiInferredScore = get("ai_inferred_score", BigDecimal::class.java),
            theme = get("theme", String::class.java),
            onboardingCompleted = get("onboarding_completed", Boolean::class.java),
            telegramChatId = get("telegram_chat_id", String::class.java),
            telegramEnabled = get("telegram_enabled", Boolean::class.java) ?: false,
            timezone = get("timezone", String::class.java) ?: "UTC",
            createdAt = get("created_at", java.sql.Timestamp::class.java).toInstant(),
            lastUpdated = get("last_updated", java.sql.Timestamp::class.java).toInstant()
        )
    }
}
