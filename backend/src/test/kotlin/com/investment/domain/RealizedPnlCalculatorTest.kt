package com.investment.domain

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant

class RealizedPnlCalculatorTest {

    private val t0 = Instant.parse("2024-01-01T12:00:00Z")
    private val t1 = Instant.parse("2024-02-01T12:00:00Z")

    @Test
    fun `FIFO long buy then sell`() {
        val entries = listOf(
            RealizedPnlCalculator.TransactionEntry("AAA", "BUY", BigDecimal("10"), BigDecimal("100"), t0),
            RealizedPnlCalculator.TransactionEntry("AAA", "SELL", BigDecimal("10"), BigDecimal("110"), t1)
        )
        val r = RealizedPnlCalculator.compute(entries)
        assertEquals(1, r.trades.size)
        assertEquals(BigDecimal("100.00"), r.trades[0].pnl)
        assertEquals(BigDecimal("100.00"), r.totalRealizedPnl)
        assertEquals(BigDecimal("100.00"), r.totalRealizedPnlBySymbol["AAA"])
    }

    @Test
    fun `FIFO short then cover`() {
        val entries = listOf(
            RealizedPnlCalculator.TransactionEntry("BBB", "SHORT", BigDecimal("5"), BigDecimal("50"), t0),
            RealizedPnlCalculator.TransactionEntry("BBB", "COVER", BigDecimal("5"), BigDecimal("45"), t1)
        )
        val r = RealizedPnlCalculator.compute(entries)
        assertEquals(1, r.trades.size)
        assertEquals(BigDecimal("25.00"), r.trades[0].pnl)
    }
}
