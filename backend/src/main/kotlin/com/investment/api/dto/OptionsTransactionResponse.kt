package com.investment.api.dto

import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

data class OptionsTransactionResponse(
    val id: UUID,
    val underlyingSymbol: String,
    val optionType: String,           // CALL | PUT
    val action: String,               // BUY | SELL
    val strikePrice: BigDecimal,
    val expirationDate: LocalDate,
    val contracts: Int,
    val premiumPerContract: BigDecimal,
    val totalPremium: BigDecimal,     // contracts * premiumPerContract * 100
    val currentPremium: BigDecimal?,  // null when market data unavailable
    val pnl: BigDecimal?,             // null when currentPremium unavailable
    val pnlPercent: BigDecimal?,      // null when currentPremium unavailable
    val daysToExpiry: Int,
    val status: String,               // ACTIVE | EXPIRED | EXERCISED | CLOSED
    val notes: String?,
    val executedAt: Instant,
    val createdAt: Instant
)

data class OptionsListResponse(
    val positions: List<OptionsTransactionResponse>,
    val optionsTrackEnabled: Boolean
)
