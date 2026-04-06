package com.investment.domain

import com.investment.api.dto.HoldingResponse
import com.investment.api.dto.TargetAllocationResponse
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

class RecommendationGapCalculatorTest {

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

    private fun alloc(symbol: String, targetPct: String) = TargetAllocationResponse(
        id = UUID.randomUUID(),
        symbol = symbol,
        assetType = "ETF",
        targetPercentage = BigDecimal(targetPct),
        label = symbol,
        displayOrder = 0,
        createdAt = now,
        updatedAt = now
    )

    @Test
    fun `excludes overweight positions from gaps`() {
        // VOO: 80% current, 40% target -> overweight, excluded
        // VTI: 20% current, 60% target -> underweight, included
        val holdings = listOf(holding("VOO", "80"), holding("VTI", "20"))
        val allocations = listOf(alloc("VOO", "40"), alloc("VTI", "60"))
        val prices = mapOf("VOO" to BigDecimal("100"), "VTI" to BigDecimal("100"))
        val total = RecommendationGapCalculator.computePortfolioTotal(holdings, prices)

        val gaps = RecommendationGapCalculator.computeUnderweightGaps(holdings, allocations, prices, total)

        assertEquals(1, gaps.size)
        assertEquals("VTI", gaps[0].symbol)
        assertEquals(BigDecimal("40.00"), gaps[0].gapPercent)
    }

    @Test
    fun `sorts gaps by percent descending`() {
        // Portfolio $3000: AAA $1000 (33%), BBB $1000 (33%), CCC $1000 (33%)
        // Targets: AAA 50%, BBB 40%, CCC 10%
        // AAA gap: 50-33=17%, BBB gap: 40-33=7%, CCC overweight -> excluded
        val holdings = listOf(holding("AAA", "10"), holding("BBB", "10"), holding("CCC", "10"))
        val allocations = listOf(alloc("AAA", "50"), alloc("BBB", "40"), alloc("CCC", "10"))
        val prices = mapOf("AAA" to BigDecimal("100"), "BBB" to BigDecimal("100"), "CCC" to BigDecimal("100"))
        val total = RecommendationGapCalculator.computePortfolioTotal(holdings, prices)

        val gaps = RecommendationGapCalculator.computeUnderweightGaps(holdings, allocations, prices, total)

        assertEquals(2, gaps.size)
        assertEquals("AAA", gaps[0].symbol, "AAA should rank first (larger gap)")
        assertEquals("BBB", gaps[1].symbol)
        assertTrue(gaps[0].gapPercent > gaps[1].gapPercent)
    }

    @Test
    fun `respects limit parameter`() {
        val holdings = (1..10).map { holding("S$it", "10") }
        val allocations = (1..10).map { alloc("S$it", "20") } // all underweight vs 20% target at 10% current
        val prices = (1..10).associate { "S$it" to BigDecimal("100") }
        val total = RecommendationGapCalculator.computePortfolioTotal(holdings, prices)

        val gaps = RecommendationGapCalculator.computeUnderweightGaps(holdings, allocations, prices, total, limit = 3)

        assertEquals(3, gaps.size)
    }

    @Test
    fun `handles zero portfolio total without dividing by zero`() {
        val holdings = listOf(holding("VOO", "10"))
        val allocations = listOf(alloc("VOO", "100"))
        // No prices -> total = 0
        val total = RecommendationGapCalculator.computePortfolioTotal(holdings, emptyMap())

        assertEquals(BigDecimal("0.00"), total)

        val gaps = RecommendationGapCalculator.computeUnderweightGaps(holdings, allocations, emptyMap(), total)

        // gap = 100% - 0% = 100%, gapValue = 0 * 1.0 = 0
        assertEquals(1, gaps.size)
        assertEquals(BigDecimal("100.00"), gaps[0].gapPercent)
        assertEquals(BigDecimal("0.00"), gaps[0].gapValue)
    }

    @Test
    fun `excludes SHORT track holdings from portfolio total`() {
        val holdings = listOf(
            holding("VOO", "10", track = "LONG"),  // $1000
            holding("SPY", "5", track = "SHORT")   // should be excluded
        )
        val prices = mapOf("VOO" to BigDecimal("100"), "SPY" to BigDecimal("400"))

        val total = RecommendationGapCalculator.computePortfolioTotal(holdings, prices)

        assertEquals(BigDecimal("1000.00"), total)
    }

    @Test
    fun `allocations with no matching holding are treated as fully underweight`() {
        // VOO has 100% target but zero holdings
        val holdings = emptyList<HoldingResponse>()
        val allocations = listOf(alloc("VOO", "100"))
        val prices = mapOf("VOO" to BigDecimal("200"))
        val total = RecommendationGapCalculator.computePortfolioTotal(holdings, prices)

        val gaps = RecommendationGapCalculator.computeUnderweightGaps(holdings, allocations, prices, total)

        // total is 0, so gapPercent = 100% and gapValue = 0
        assertEquals(1, gaps.size)
        assertEquals(BigDecimal("100.00"), gaps[0].gapPercent)
        assertEquals(BigDecimal("200"), gaps[0].currentPrice)
    }
}
