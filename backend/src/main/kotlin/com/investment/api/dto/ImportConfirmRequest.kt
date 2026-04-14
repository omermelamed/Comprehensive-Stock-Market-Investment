package com.investment.api.dto

import com.investment.domain.ParsedTransactionRow

data class ImportConfirmRequest(
    val rows: List<ParsedTransactionRow>
)
