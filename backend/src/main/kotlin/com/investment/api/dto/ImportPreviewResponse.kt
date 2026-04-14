package com.investment.api.dto

import com.investment.domain.ParsedTransactionRow

data class ImportPreviewResponse(
    val detectedColumns: List<String>,
    val rows: List<ImportRowResultDto>,
    val validCount: Int,
    val errorCount: Int
)

data class ImportRowResultDto(
    val rowIndex: Int,
    val status: String,          // "OK" or "ERROR"
    val errors: List<String>,
    val parsedRow: ParsedTransactionRow?   // non-null when status == OK
)
