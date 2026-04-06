package com.investment.api.dto

import java.time.Instant
import java.util.UUID

data class WatchlistItemResponse(
    val id: UUID,
    val symbol: String,
    val companyName: String?,
    val assetType: String,
    val signal: String,
    val signalSummary: String?,
    val fullAnalysis: Map<String, Any>?,
    val confidenceScore: Int? = null,
    val lastAnalyzedAt: Instant?,
    val addedAt: Instant
)
