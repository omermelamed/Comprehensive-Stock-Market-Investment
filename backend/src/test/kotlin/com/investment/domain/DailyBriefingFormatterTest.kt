package com.investment.domain

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.LocalDate

class DailyBriefingFormatterTest {

    private val date = LocalDate.of(2026, 4, 18)

    private fun fullData() = DailyBriefingData(
        date = date,
        currency = "USD",
        marketOpen = true,
        portfolioChangeAbsolute = BigDecimal("847.50"),
        portfolioChangePercent = BigDecimal("1.23"),
        portfolioTotal = BigDecimal("69000.00"),
        topGainers = listOf(
            HoldingMover("NVDA", BigDecimal("4.20"), BigDecimal("12400.00")),
            HoldingMover("AAPL", BigDecimal("1.80"), BigDecimal("8200.00"))
        ),
        topLosers = listOf(
            HoldingMover("BNDX", BigDecimal("-0.30"), BigDecimal("3200.00"))
        ),
        sectorBreakdown = listOf(
            SectorAllocation("Technology", BigDecimal("42.10")),
            SectorAllocation("Bonds", BigDecimal("18.30"))
        ),
        marketIndices = listOf(
            MarketIndex("^GSPC", "S&P 500", BigDecimal("0.87")),
            MarketIndex("^IXIC", "NASDAQ", BigDecimal("1.12"))
        ),
        newsHeadlines = listOf(
            NewsHeadline("NVDA", "Nvidia hits record on AI demand surge"),
            NewsHeadline("AAPL", "Apple expands manufacturing in India")
        )
    )

    @Test
    fun `full data produces all sections`() {
        val text = DailyBriefingFormatter.format(fullData())
        assertTrue(text.contains("Daily Portfolio Briefing"))
        assertTrue(text.contains("+\$847.50"))
        assertTrue(text.contains("+1.23%"))
        assertTrue(text.contains("S&P 500"))
        assertTrue(text.contains("NVDA"))
        assertTrue(text.contains("BNDX"))
        assertTrue(text.contains("Technology"))
        assertTrue(text.contains("Nvidia hits record"))
    }

    @Test
    fun `null portfolio change omits change line`() {
        val data = fullData().copy(portfolioChangeAbsolute = null, portfolioChangePercent = null)
        val text = DailyBriefingFormatter.format(data)
        assertFalse(text.contains("+\$847"))
        assertTrue(text.contains("Daily Portfolio Briefing"))
    }

    @Test
    fun `empty news omits headlines section`() {
        val data = fullData().copy(newsHeadlines = emptyList())
        val text = DailyBriefingFormatter.format(data)
        assertFalse(text.contains("Headlines"))
        assertTrue(text.contains("NVDA"))
    }

    @Test
    fun `empty gainers and losers omits top movers section`() {
        val data = fullData().copy(topGainers = emptyList(), topLosers = emptyList())
        val text = DailyBriefingFormatter.format(data)
        assertFalse(text.contains("Gainers"))
        assertFalse(text.contains("Losers"))
    }

    @Test
    fun `empty market indices omits market section`() {
        val data = fullData().copy(marketIndices = emptyList())
        val text = DailyBriefingFormatter.format(data)
        assertFalse(text.contains("S&P 500"))
    }

    @Test
    fun `positive change prefixed with plus sign`() {
        val text = DailyBriefingFormatter.format(fullData())
        assertTrue(text.contains("+\$847.50 (+1.23%)"))
    }

    @Test
    fun `negative change shows minus sign`() {
        val data = fullData().copy(
            portfolioChangeAbsolute = BigDecimal("-300.00"),
            portfolioChangePercent = BigDecimal("-0.45")
        )
        val text = DailyBriefingFormatter.format(data)
        assertTrue(text.contains("-\$300.00 (-0.45%)"))
    }
}
