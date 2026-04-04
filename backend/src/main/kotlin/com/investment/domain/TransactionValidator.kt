package com.investment.domain

import com.investment.api.dto.TransactionRequest
import java.math.BigDecimal

sealed class ValidationResult {
    object Valid : ValidationResult()
    data class Invalid(val message: String) : ValidationResult()
}

object TransactionValidator {

    fun validate(request: TransactionRequest, currentHolding: BigDecimal): ValidationResult {
        return when (request.type.uppercase()) {
            "SELL" -> {
                if (request.quantity > currentHolding) {
                    ValidationResult.Invalid(
                        "Cannot sell ${request.quantity} units of ${request.symbol} — " +
                            "current long holding is $currentHolding"
                    )
                } else {
                    ValidationResult.Valid
                }
            }
            "COVER" -> {
                if (request.quantity > currentHolding) {
                    ValidationResult.Invalid(
                        "Cannot cover ${request.quantity} units of ${request.symbol} — " +
                            "current short exposure is $currentHolding"
                    )
                } else {
                    ValidationResult.Valid
                }
            }
            "BUY", "SHORT" -> ValidationResult.Valid
            else -> ValidationResult.Invalid("Unknown transaction type: ${request.type}")
        }
    }
}
