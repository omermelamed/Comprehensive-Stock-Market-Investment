package com.investment.api.dto

data class ImportSummaryResponse(
    val imported: Int,
    val skipped: Int
)
