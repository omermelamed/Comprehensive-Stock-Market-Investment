package com.investment.domain

object RiskLevelCalculator {

    fun calculate(questionnaireAnswers: Map<String, Any>): String {
        val experienceScore = when (questionnaireAnswers["experience"]?.toString()) {
            "BEGINNER" -> 0
            "SOME_EXPERIENCE" -> 1
            "EXPERIENCED" -> 2
            else -> 0
        }

        val timeHorizonScore = when (questionnaireAnswers["timeHorizon"]?.toString()) {
            "1_3_YEARS" -> 0
            "3_10_YEARS" -> 1
            "10_20_YEARS" -> 2
            "20_PLUS_YEARS" -> 3
            else -> 0
        }

        val reactionScore = when (questionnaireAnswers["reactionToDrop"]?.toString()) {
            "SELL" -> 0
            "HOLD" -> 1
            "BUY_MORE" -> 2
            else -> 0
        }

        val total = experienceScore + timeHorizonScore + reactionScore

        return when {
            total <= 2 -> "CONSERVATIVE"
            total <= 5 -> "MODERATE"
            else -> "AGGRESSIVE"
        }
    }
}
