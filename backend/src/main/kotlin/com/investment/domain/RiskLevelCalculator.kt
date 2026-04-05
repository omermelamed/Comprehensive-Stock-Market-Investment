package com.investment.domain

/**
 * Computes risk level from the 6-question questionnaire (each scored 1–5)
 * plus the time horizon from the user profile.
 *
 * Questionnaire keys: riskTolerance, incomeStability, investmentExperience,
 *                     liquidityNeed, portfolioObjective, shortSellingComfort
 *
 * Max questionnaire score: 30 (6 × 5)
 * Time horizon bonus: 1–5 based on years
 * Effective max: 35
 *
 * Thresholds: ≤ 14 → CONSERVATIVE, ≤ 24 → MODERATE, > 24 → AGGRESSIVE
 */
object RiskLevelCalculator {

    private val QUESTIONNAIRE_KEYS = listOf(
        "riskTolerance",
        "incomeStability",
        "investmentExperience",
        "liquidityNeed",
        "portfolioObjective",
        "shortSellingComfort",
    )

    fun calculate(questionnaireAnswers: Map<String, Any>, timeHorizonYears: Int): String {
        val questionnaireScore = QUESTIONNAIRE_KEYS.sumOf { key ->
            val raw = questionnaireAnswers[key]
            val value = when (raw) {
                is Number -> raw.toInt()
                is String -> raw.toIntOrNull() ?: 0
                else -> 0
            }
            value.coerceIn(1, 5)
        }

        val horizonScore = when {
            timeHorizonYears < 3  -> 1
            timeHorizonYears < 7  -> 2
            timeHorizonYears < 12 -> 3
            timeHorizonYears < 20 -> 4
            else                  -> 5
        }

        val total = questionnaireScore + horizonScore

        return when {
            total <= 14 -> "CONSERVATIVE"
            total <= 24 -> "MODERATE"
            else        -> "AGGRESSIVE"
        }
    }
}
