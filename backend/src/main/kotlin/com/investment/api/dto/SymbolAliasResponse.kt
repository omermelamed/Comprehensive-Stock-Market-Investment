package com.investment.api.dto

import java.time.Instant
import java.util.UUID

data class SymbolAliasResponse(
    val id: UUID,
    val alias: String,
    val yahooSymbol: String,
    val createdAt: Instant
)

data class CreateSymbolAliasRequest(
    val alias: String,
    val yahooSymbol: String
)
