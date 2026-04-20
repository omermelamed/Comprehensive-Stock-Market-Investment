package com.investment.application

import org.springframework.stereotype.Service
import java.util.UUID

/**
 * Builds a compact portfolio context string for injection into Telegram bot prompts.
 * Delegates to SharedContextBuilder to keep context consistent with other AI features.
 */
@Service
class TelegramContextBuilder(
    private val sharedContextBuilder: SharedContextBuilder
) {

    /** Used from HTTP request context — resolves userId via RequestContext. */
    fun build(): String {
        return try {
            sharedContextBuilder.build().contextString
        } catch (e: Exception) {
            "Portfolio context unavailable."
        }
    }

    /** Used from scheduler/background threads where no HTTP request context exists. */
    fun build(userId: UUID): String {
        return try {
            sharedContextBuilder.build(userId).contextString
        } catch (e: Exception) {
            "Portfolio context unavailable."
        }
    }
}
