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

    fun findOne(): UserProfileResponse? {
        val record = dsl.fetchOne("SELECT * FROM user_profile LIMIT 1")
        return record?.toResponse()
    }

    fun upsert(request: UserProfileRequest, riskLevel: String): UserProfileResponse {
        val id = UUID.randomUUID()
        val tracksJson = objectMapper.writeValueAsString(request.tracksEnabled)
        val answersJson = objectMapper.writeValueAsString(request.questionnaireAnswers)

        val record = dsl.fetchOne(
            """
            INSERT INTO user_profile (
                id, display_name, preferred_currency, risk_level,
                time_horizon_years, monthly_investment_min, monthly_investment_max,
                investment_goal, tracks_enabled, questionnaire_answers, theme,
                telegram_chat_id, telegram_enabled, timezone, onboarding_completed, created_at, last_updated
            ) VALUES (
                ?::uuid, ?, ?, ?::risk_level_enum,
                ?, ?, ?,
                ?, ?::jsonb, ?::jsonb, ?,
                ?, ?, ?, false, NOW(), NOW()
            )
            ON CONFLICT ((TRUE)) DO UPDATE SET
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
            id.toString(),
            request.displayName,
            request.preferredCurrency,
            riskLevel,
            request.timeHorizonYears,
            request.monthlyInvestmentMin,
            request.monthlyInvestmentMax,
            request.investmentGoal,
            tracksJson,
            answersJson,
            request.theme,
            request.telegramChatId,
            request.telegramEnabled,
            request.timezone
        ) ?: throw IllegalStateException("Upsert into user_profile returned no record")

        return record.toResponse()
    }

    fun update(request: UserProfileRequest, riskLevel: String): UserProfileResponse {
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
            RETURNING *
            """.trimIndent(),
            request.displayName,
            request.preferredCurrency,
            riskLevel,
            request.timeHorizonYears,
            request.monthlyInvestmentMin,
            request.monthlyInvestmentMax,
            request.investmentGoal,
            tracksJson,
            answersJson,
            request.theme,
            request.telegramChatId,
            request.telegramEnabled,
            request.timezone
        ) ?: throw NoSuchElementException("No user profile found to update")

        return record.toResponse()
    }

    fun setOnboardingCompleted(): UserProfileResponse {
        val record = dsl.fetchOne(
            "UPDATE user_profile SET onboarding_completed = true RETURNING *"
        ) ?: throw NoSuchElementException("No user profile found")

        return record.toResponse()
    }

    fun findTimezone(): String? {
        return dsl.fetchOne("SELECT timezone FROM user_profile LIMIT 1")
            ?.get("timezone", String::class.java)
    }

    /** Alias for findOne() with a name that matches scheduler usage. */
    fun findProfile() = findOne()

    fun linkTelegramChat(chatId: String) {
        dsl.execute(
            "UPDATE user_profile SET telegram_chat_id = ?, telegram_enabled = true, last_updated = NOW()",
            chatId
        )
    }

    fun updateRiskScore(riskLevel: String, aiInferredScore: BigDecimal) {
        dsl.execute(
            "UPDATE user_profile SET risk_level = ?::risk_level_enum, ai_inferred_score = ?, last_updated = NOW()",
            riskLevel,
            aiInferredScore
        )
    }

    private fun Record.toResponse(): UserProfileResponse {
        val tracksJson = get("tracks_enabled")?.toString() ?: "[]"
        val answersJson = get("questionnaire_answers")?.toString() ?: "{}"

        val tracks: List<String> = objectMapper.readValue(tracksJson)
        val answers: Map<String, Any> = objectMapper.readValue(answersJson)

        return UserProfileResponse(
            id = UUID.fromString(get("id", String::class.java)),
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
            telegramChatId  = get("telegram_chat_id", String::class.java),
            telegramEnabled = get("telegram_enabled", Boolean::class.java) ?: false,
            timezone = get("timezone", String::class.java) ?: "UTC",
            createdAt = get("created_at", java.sql.Timestamp::class.java).toInstant(),
            lastUpdated = get("last_updated", java.sql.Timestamp::class.java).toInstant()
        )
    }
}
