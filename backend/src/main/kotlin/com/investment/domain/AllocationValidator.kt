package com.investment.domain

import com.investment.api.dto.TargetAllocationRequest
import java.math.BigDecimal

data class AllocationValidationError(val field: String, val message: String)

object AllocationValidator {

    fun validate(allocations: List<TargetAllocationRequest>): List<AllocationValidationError> {
        val errors = mutableListOf<AllocationValidationError>()

        if (allocations.isEmpty()) {
            errors.add(AllocationValidationError("allocations", "At least one allocation is required"))
            return errors
        }

        allocations.forEachIndexed { index, allocation ->
            if (allocation.targetPercentage <= BigDecimal.ZERO) {
                errors.add(
                    AllocationValidationError(
                        "allocations[$index].targetPercentage",
                        "Target percentage must be greater than 0 for symbol '${allocation.symbol}'"
                    )
                )
            }
        }

        val symbolGroups = allocations.groupBy { it.symbol.uppercase() }
        symbolGroups.filter { it.value.size > 1 }.forEach { (symbol, _) ->
            errors.add(
                AllocationValidationError(
                    "allocations.symbol",
                    "Duplicate symbol '$symbol' found — each symbol may only appear once"
                )
            )
        }

        val total = allocations.fold(BigDecimal.ZERO) { acc, a -> acc + a.targetPercentage }
        if (total.compareTo(BigDecimal("100.00")) != 0) {
            errors.add(
                AllocationValidationError(
                    "allocations.targetPercentage",
                    "Target percentages must sum to 100, but sum is $total"
                )
            )
        }

        return errors
    }
}
