package com.investment.domain

import java.math.BigDecimal

sealed interface AllocationStatus {
    object ON_TARGET : AllocationStatus
    object SLIGHTLY_OFF : AllocationStatus
    object NEEDS_REBALANCING : AllocationStatus
    object UNTRACKED : AllocationStatus
}

object AllocationStatusCalculator {

    private val ON_TARGET_THRESHOLD = BigDecimal("2.0")
    private val SLIGHTLY_OFF_THRESHOLD = BigDecimal("10.0")

    fun compute(currentPercent: BigDecimal, targetPercent: BigDecimal): AllocationStatus {
        val drift = currentPercent - targetPercent
        val absDrift = drift.abs()
        return when {
            absDrift <= ON_TARGET_THRESHOLD -> AllocationStatus.ON_TARGET
            absDrift <= SLIGHTLY_OFF_THRESHOLD -> AllocationStatus.SLIGHTLY_OFF
            else -> AllocationStatus.NEEDS_REBALANCING
        }
    }
}
