package com.investment.domain

import java.math.BigDecimal
import java.time.LocalDate

data class DailyBriefingData(
    val date: LocalDate,
    val currency: String,
    val marketOpen: Boolean,
    val portfolioChangeAbsolute: BigDecimal?,
    val portfolioChangePercent: BigDecimal?,
    val portfolioTotal: BigDecimal,
    val topGainers: List<HoldingMover>,
    val topLosers: List<HoldingMover>,
    val sectorBreakdown: List<SectorAllocation>,
    val marketIndices: List<MarketIndex>,
    val newsHeadlines: List<NewsHeadline>,
)

data class HoldingMover(
    val symbol: String,
    val dayChangePercent: BigDecimal,
    val portfolioValue: BigDecimal,
)

data class SectorAllocation(
    val sector: String,
    val portfolioPercent: BigDecimal,
)

data class MarketIndex(
    val symbol: String,
    val label: String,
    val dayChangePercent: BigDecimal,
)

data class NewsHeadline(
    val symbol: String,
    val headline: String,
)
