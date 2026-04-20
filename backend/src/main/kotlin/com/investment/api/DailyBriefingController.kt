package com.investment.api

import com.investment.api.dto.DailyBriefingResponse
import com.investment.api.dto.HoldingMoverDto
import com.investment.api.dto.MarketIndexDto
import com.investment.api.dto.NewsHeadlineDto
import com.investment.api.dto.SectorBreakdownDto
import com.investment.application.DailyBriefingDataCollector
import com.investment.domain.DailyBriefingFormatter
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/briefing")
class DailyBriefingController(
    private val dataCollector: DailyBriefingDataCollector,
) {

    @GetMapping("/daily")
    fun getDailyBriefing(): ResponseEntity<DailyBriefingResponse> {
        val data = dataCollector.collect()
        val briefingText = DailyBriefingFormatter.format(data)

        val response = DailyBriefingResponse(
            date = data.date,
            currency = data.currency,
            marketOpen = data.marketOpen,
            portfolioChangePercent = data.portfolioChangePercent,
            portfolioChangeAbsolute = data.portfolioChangeAbsolute,
            portfolioTotal = data.portfolioTotal,
            marketIndices = data.marketIndices.map { MarketIndexDto(it.symbol, it.label, it.dayChangePercent) },
            topGainers = data.topGainers.map { HoldingMoverDto(it.symbol, it.dayChangePercent, it.portfolioValue) },
            topLosers = data.topLosers.map { HoldingMoverDto(it.symbol, it.dayChangePercent, it.portfolioValue) },
            sectorBreakdown = data.sectorBreakdown.map { SectorBreakdownDto(it.sector, it.portfolioPercent) },
            newsHeadlines = data.newsHeadlines.map { NewsHeadlineDto(it.symbol, it.headline) },
            briefingText = briefingText,
        )
        return ResponseEntity.ok(response)
    }
}
