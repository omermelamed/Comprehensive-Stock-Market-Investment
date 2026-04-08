package com.investment.api.dto

import java.math.BigDecimal
import java.time.LocalDate

data class OptionsTransactionRequest(
    val underlyingSymbol: String,
    val optionType: String,          // CALL | PUT
    val action: String,              // BUY | SELL
    val strikePrice: BigDecimal,
    val expirationDate: LocalDate,
    val contracts: Int,
    val premiumPerContract: BigDecimal,
    val notes: String? = null
)

data class UpdateOptionsStatusRequest(
    val status: String               // EXPIRED | EXERCISED | CLOSED
)
