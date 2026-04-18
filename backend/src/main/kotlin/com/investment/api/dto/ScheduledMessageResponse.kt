package com.investment.api.dto

import java.time.Instant
import java.util.UUID

data class ScheduledMessageResponse(
    val id: UUID,
    val messageType: String,
    val label: String,
    val frequency: String,
    val dayOfWeek: Int?,
    val biweeklyWeek: Int?,
    val dayOfMonth: Int?,
    val sendTime: String,         // "HH:mm"
    val isActive: Boolean,
    val lastSentAt: Instant?,
    val nextSendAt: Instant,
    val sendCount: Int,
    val createdAt: Instant
)

data class ScheduledMessageLogEntry(
    val id: UUID,
    val sentAt: Instant,
    val status: String,
    val errorMessage: String?,
    val telegramMessageId: String?
)
