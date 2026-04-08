package com.investment.domain

import java.math.BigDecimal
import java.math.RoundingMode

/**
 * Pure calculator for options P&L.
 *
 * One options contract controls 100 shares.
 * For EXPIRED positions, P&L = -totalPremium (total loss of premium paid for BUY).
 * For SELL (short) positions, collected premium is the gain baseline.
 */
object OptionsPnlCalculator {

    /**
     * Computes P&L given current premium. Returns null if currentPremium is null.
     *
     * BUY  (long)  P&L = (currentPremium - entryPremium) * contracts * 100
     * SELL (short) P&L = (entryPremium - currentPremium) * contracts * 100
     */
    fun computePnl(
        action: String,
        entryPremium: BigDecimal,
        currentPremium: BigDecimal?,
        contracts: Int
    ): BigDecimal? {
        currentPremium ?: return null
        val multiplier = BigDecimal.valueOf(contracts.toLong() * 100L)
        return when (action.uppercase()) {
            "BUY"  -> (currentPremium - entryPremium) * multiplier
            "SELL" -> (entryPremium - currentPremium) * multiplier
            else   -> null
        }
    }

    /**
     * Expired options: BUY position loses the full premium paid.
     *                  SELL position keeps the full premium collected.
     */
    fun computeExpiredPnl(
        action: String,
        totalPremium: BigDecimal
    ): BigDecimal = when (action.uppercase()) {
        "BUY"  -> totalPremium.negate()
        "SELL" -> totalPremium
        else   -> BigDecimal.ZERO
    }

    fun computePnlPercent(pnl: BigDecimal, totalPremium: BigDecimal): BigDecimal? {
        if (totalPremium.compareTo(BigDecimal.ZERO) == 0) return null
        return pnl.divide(totalPremium, 6, RoundingMode.HALF_UP)
            .multiply(BigDecimal("100"))
            .setScale(2, RoundingMode.HALF_UP)
    }
}
