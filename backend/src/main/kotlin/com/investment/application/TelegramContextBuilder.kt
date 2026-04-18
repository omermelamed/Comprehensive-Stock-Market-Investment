package com.investment.application

import org.springframework.stereotype.Service

/**
 * Builds a compact portfolio context string for injection into Telegram bot prompts.
 * Delegates to SharedContextBuilder to keep context consistent with other AI features.
 */
@Service
class TelegramContextBuilder(
    private val sharedContextBuilder: SharedContextBuilder
) {

    fun build(): String {
        return try {
            sharedContextBuilder.build().contextString
        } catch (e: Exception) {
            "Portfolio context unavailable."
        }
    }
}
