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

        // Children grouped by parent reference (parentId holds the parent's symbol during bulk replace)
        val childrenByParent = allocations
            .filter { it.parentId != null }
            .groupBy { it.parentId!!.uppercase() }

        for ((parentRef, children) in childrenByParent) {
            val parent = allocations.find { it.symbol.uppercase() == parentRef }
            if (parent != null) {
                val childSum = children.fold(BigDecimal.ZERO) { acc, c -> acc + c.targetPercentage }
                if (childSum.compareTo(parent.targetPercentage) != 0) {
                    errors.add(
                        AllocationValidationError(
                            "allocations.children",
                            "Children of '${parent.symbol}' sum to $childSum but parent target is ${parent.targetPercentage}"
                        )
                    )
                }
            }
        }

        // Top-level total: only count rows that are NOT children (parentId == null).
        // Category parents count in the total; their children do not (they sum to the parent).
        val topLevel = allocations.filter { it.parentId == null }
        val total = topLevel.fold(BigDecimal.ZERO) { acc, a -> acc + a.targetPercentage }
        if (total.compareTo(BigDecimal("100.00")) != 0) {
            errors.add(
                AllocationValidationError(
                    "allocations.targetPercentage",
                    "Top-level allocations must sum to 100, but sum is $total"
                )
            )
        }

        return errors
    }
}
