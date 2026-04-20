package com.investment.api.dto

import java.math.BigDecimal
import java.time.LocalDate

data class DailyBriefingResponse(
    val date: LocalDate,
    val currency: String,
    val marketOpen: Boolean,
    val portfolioChangePercent: BigDecimal?,
    val portfolioChangeAbsolute: BigDecimal?,
    val portfolioTotal: BigDecimal,
    val marketIndices: List<MarketIndexDto>,
    val topGainers: List<HoldingMoverDto>,
    val topLosers: List<HoldingMoverDto>,
    val sectorBreakdown: List<SectorBreakdownDto>,
    val newsHeadlines: List<NewsHeadlineDto>,
    val briefingText: String,
)

data class MarketIndexDto(
    val symbol: String,
    val label: String,
    val dayChangePercent: BigDecimal,
)

data class HoldingMoverDto(
    val symbol: String,
    val dayChangePercent: BigDecimal,
    val portfolioValue: BigDecimal,
)

data class SectorBreakdownDto(
    val sector: String,
    val portfolioPercent: BigDecimal,
)

data class NewsHeadlineDto(
    val symbol: String,
    val headline: String,
)
