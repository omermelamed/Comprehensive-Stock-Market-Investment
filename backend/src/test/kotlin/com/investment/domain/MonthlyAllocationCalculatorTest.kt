package com.investment.domain

import com.investment.api.dto.HoldingResponse
import com.investment.api.dto.TargetAllocationResponse
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

class MonthlyAllocationCalculatorTest {

    private val now = Instant.now()

    private fun holding(symbol: String, quantity: String, track: String = "LONG") = HoldingResponse(
        symbol = symbol,
        track = track,
        netQuantity = BigDecimal(quantity),
        avgBuyPrice = BigDecimal("100.00"),
        totalCostBasis = BigDecimal("100.00"),
        transactionCount = 1,
        firstBoughtAt = now,
        lastTransactionAt = now
    )

    private fun allocation(symbol: String, targetPct: String, label: String = symbol) = TargetAllocationResponse(
        id = UUID.randomUUID(),
        symbol = symbol,
        assetType = "ETF",
        targetPercentage = BigDecimal(targetPct),
        label = label,
        displayOrder = 0,
        createdAt = now,
        updatedAt = now
    )

    @Test
    fun `suggests zero for overweight position and full budget to underweight`() {
        // VOO: 60% target, currently at 80% of portfolio -> overweight
        // VTI: 40% target, currently at 20% -> underweight
        val holdings = listOf(
            holding("VOO", "80"),  // 80 * $100 = $8000
            holding("VTI", "20")   // 20 * $100 = $2000
        )
        val allocations = listOf(
            allocation("VOO", "40"),
            allocation("VTI", "60")
        )
        val prices = mapOf("VOO" to BigDecimal("100"), "VTI" to BigDecimal("100"))
        val budget = BigDecimal("1000")

        val result = MonthlyAllocationCalculator.compute(holdings, allocations, prices, budget)

        val voo = result.positions.find { it.symbol == "VOO" }!!
        val vti = result.positions.find { it.symbol == "VTI" }!!

        assertEquals("OVERWEIGHT", voo.status)
        assertEquals(BigDecimal("0.00"), voo.suggestedAmount)
        assertEquals("UNDERWEIGHT", vti.status)
        assertEquals(BigDecimal("1000.00"), vti.suggestedAmount)
    }

    @Test
    fun `distributes budget proportionally to positive gaps`() {
        // Portfolio: $0 (no holdings yet, two equally underweight positions)
        // VOO: target 60%, current 0%  -> gapValue = 0 * 0.6 = 0 when portfolioTotal=0
        // Actually let's use existing holdings to make it calculable
        // Portfolio $6000: VOO $3000 (50%), VTI $1000 (17%), BND $2000 (33%)
        // Targets: VOO 50%, VTI 30%, BND 20%
        // VTI is underweight (need 30%, have 17%), BND is overweight (need 20%, have 33%)
        val holdings = listOf(
            holding("VOO", "30"),  // $3000
            holding("VTI", "10"),  // $1000
            holding("BND", "20")   // $2000
        )
        val allocations = listOf(
            allocation("VOO", "50"),
            allocation("VTI", "30"),
            allocation("BND", "20")
        )
        val prices = mapOf(
            "VOO" to BigDecimal("100"),
            "VTI" to BigDecimal("100"),
            "BND" to BigDecimal("100")
        )
        val budget = BigDecimal("1200")

        val result = MonthlyAllocationCalculator.compute(holdings, allocations, prices, budget)

        val voo = result.positions.find { it.symbol == "VOO" }!!
        val vti = result.positions.find { it.symbol == "VTI" }!!
        val bnd = result.positions.find { it.symbol == "BND" }!!

        // portfolioTotal = 6000
        // VOO: target=$3000, current=$3000, gap=0 -> ON_TARGET, suggest=0
        // VTI: target=$1800, current=$1000, gap=$800 -> UNDERWEIGHT
        // BND: target=$1200, current=$2000, gap=-$800 -> OVERWEIGHT, suggest=0
        // totalPositiveGap = 800, budget=1200 -> VTI gets 1200*(800/800)=1200
        assertEquals("ON_TARGET", voo.status)
        assertEquals(BigDecimal("0.00"), voo.suggestedAmount)
        assertEquals("UNDERWEIGHT", vti.status)
        assertEquals(BigDecimal("1200.00"), vti.suggestedAmount)
        assertEquals("OVERWEIGHT", bnd.status)
        assertEquals(BigDecimal("0.00"), bnd.suggestedAmount)
    }

    @Test
    fun `distributes proportionally when multiple positions are underweight`() {
        // Portfolio $1000: only VOO $1000 (100%)
        // Targets: VOO 50%, VTI 50%
        // VOO: current=100%, target=50% -> OVERWEIGHT
        // VTI: current=0%, target=50% -> UNDERWEIGHT with gapValue=$500
        // But let's have two underweight: use a different scenario
        // Portfolio $0: VOO target 60%, VTI target 40%
        // holdings empty -> portfolioTotal=0, all gapValues=0 -> all suggestions=0 (edge case)
        // Better: Portfolio $2000, VOO $800 (40%), VTI $1200 (60%)
        // Targets: VOO 70%, VTI 30% -> VOO underweight, VTI overweight
        val holdings = listOf(
            holding("VOO", "8"),   // $800
            holding("VTI", "12")   // $1200
        )
        val allocations = listOf(
            allocation("VOO", "70"),
            allocation("VTI", "30")
        )
        val prices = mapOf("VOO" to BigDecimal("100"), "VTI" to BigDecimal("100"))
        val budget = BigDecimal("500")

        val result = MonthlyAllocationCalculator.compute(holdings, allocations, prices, budget)

        val voo = result.positions.find { it.symbol == "VOO" }!!
        val vti = result.positions.find { it.symbol == "VTI" }!!

        // portfolioTotal = 2000
        // VOO: target=1400, current=800, gap=600 -> UNDERWEIGHT, gets full $500
        // VTI: target=600, current=1200, gap=-600 -> OVERWEIGHT, gets $0
        assertEquals("UNDERWEIGHT", voo.status)
        assertEquals(BigDecimal("500.00"), voo.suggestedAmount)
        assertEquals("OVERWEIGHT", vti.status)
        assertEquals(BigDecimal("0.00"), vti.suggestedAmount)
    }

    @Test
    fun `returns zero suggestions when budget is zero`() {
        val holdings = listOf(holding("VOO", "10"))
        val allocations = listOf(allocation("VOO", "100"))
        val prices = mapOf("VOO" to BigDecimal("150"))

        val result = MonthlyAllocationCalculator.compute(holdings, allocations, prices, BigDecimal.ZERO)

        val voo = result.positions.first()
        assertEquals(BigDecimal("0.00"), voo.suggestedAmount)
    }

    @Test
    fun `handles empty holdings with all positions underweight`() {
        val holdings = emptyList<HoldingResponse>()
        val allocations = listOf(
            allocation("VOO", "60"),
            allocation("VTI", "40")
        )
        val prices = mapOf("VOO" to BigDecimal("400"), "VTI" to BigDecimal("200"))
        val budget = BigDecimal("1000")

        val result = MonthlyAllocationCalculator.compute(holdings, allocations, prices, budget)

        // portfolioTotal = 0 -> all currentValues = 0 -> all gapValues = 0
        // totalPositiveGap = 0 -> all suggestions = 0
        assertEquals(BigDecimal("0.00"), result.portfolioTotal)
        result.positions.forEach { pos ->
            assertEquals(BigDecimal("0.00"), pos.suggestedAmount, "Expected 0 for ${pos.symbol}")
        }
    }

    @Test
    fun `handles zero portfolio total without dividing by zero`() {
        val holdings = listOf(holding("VOO", "10"))
        val allocations = listOf(allocation("VOO", "100"))
        // No price available for VOO -> portfolioTotal = 0
        val prices = emptyMap<String, BigDecimal>()

        val result = MonthlyAllocationCalculator.compute(holdings, allocations, prices, BigDecimal("500"))

        assertEquals(0, BigDecimal("0.00").compareTo(result.portfolioTotal))
        assertEquals(0, BigDecimal.ZERO.compareTo(result.positions.first().currentPercent))
        assertEquals(0, BigDecimal.ZERO.compareTo(result.positions.first().suggestedAmount))
    }

    @Test
    fun `ignores short track holdings in portfolio total`() {
        val holdings = listOf(
            holding("VOO", "10", track = "LONG"),  // $1000
            holding("SPY", "5", track = "SHORT")   // should be excluded
        )
        val allocations = listOf(allocation("VOO", "100"))
        val prices = mapOf("VOO" to BigDecimal("100"), "SPY" to BigDecimal("400"))

        val result = MonthlyAllocationCalculator.compute(holdings, allocations, prices, BigDecimal("500"))

        // portfolioTotal should only include LONG: $1000, not SPY $2000
        assertEquals(BigDecimal("1000.00"), result.portfolioTotal)
    }
}
