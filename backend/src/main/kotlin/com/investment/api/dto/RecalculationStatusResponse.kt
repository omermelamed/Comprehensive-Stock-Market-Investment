package com.investment.api.dto

import java.time.Instant
import java.util.UUID

data class RecalculationStatusResponse(
    val status: String,
    val jobId: UUID? = null,
    val sellDate: String? = null,
    val daysCompleted: Int? = null,
    val totalDays: Int? = null,
    val progressPercent: Double? = null,
    val estimatedSecondsRemaining: Int? = null,
    val completedAt: Instant? = null,
    val errorMessage: String? = null,
    val queuedJobCount: Int? = null
)
