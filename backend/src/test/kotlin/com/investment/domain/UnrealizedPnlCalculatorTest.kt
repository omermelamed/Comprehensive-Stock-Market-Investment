package com.investment.domain

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import java.math.BigDecimal

class UnrealizedPnlCalculatorTest {

    @Test
    fun `computes weight and pnl`() {
        val positions = listOf(
            UnrealizedPnlCalculator.PositionInput("X", null, BigDecimal("1000"), BigDecimal("800")),
            UnrealizedPnlCalculator.PositionInput("Y", "Label", BigDecimal("1000"), BigDecimal("1000"))
        )
        val out = UnrealizedPnlCalculator.compute(positions, BigDecimal("2000"))
        val x = out.find { it.symbol == "X" }!!
        assertEquals(BigDecimal("200.00"), x.pnlAbsolute)
        assertEquals(BigDecimal("25.00"), x.pnlPercent)
        assertEquals(BigDecimal("50.00"), x.portfolioWeightPct)
    }
}
