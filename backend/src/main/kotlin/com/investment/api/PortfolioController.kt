package com.investment.api

import com.investment.api.dto.HoldingDashboardResponse
import com.investment.api.dto.PortfolioDataPoint
import com.investment.api.dto.PortfolioHistoryResponse
import com.investment.api.dto.PortfolioSummaryResponse
import com.investment.application.PortfolioSummaryService
import com.investment.infrastructure.SnapshotRepository
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.Clock
import java.time.LocalDate

@RestController
@RequestMapping("/api/portfolio")
class PortfolioController(
    private val portfolioSummaryService: PortfolioSummaryService,
    private val snapshotRepository: SnapshotRepository,
    private val clock: Clock,
) {

    @GetMapping("/summary")
    fun getSummary(): PortfolioSummaryResponse {
        return portfolioSummaryService.getPortfolioSummary()
    }

    @GetMapping("/holdings")
    fun getHoldings(): List<HoldingDashboardResponse> {
        return portfolioSummaryService.getHoldingsDashboard()
    }

    @GetMapping("/history")
    fun getHistory(@RequestParam(defaultValue = "1M") range: String): PortfolioHistoryResponse {
        val today = LocalDate.now(clock)
        val records = when (range) {
            "1W" -> snapshotRepository.findByDateRange(today.minusDays(7), today)
            "1M" -> snapshotRepository.findByDateRange(today.minusDays(30), today)
            "3M" -> snapshotRepository.findByDateRange(today.minusDays(90), today)
            "6M" -> snapshotRepository.findByDateRange(today.minusDays(180), today)
            "1Y" -> snapshotRepository.findByDateRange(today.minusDays(365), today)
            "ALL" -> snapshotRepository.findAllOrderedByDate()
            else -> snapshotRepository.findByDateRange(today.minusDays(30), today)
        }
        val points = records.map { r ->
            PortfolioDataPoint(
                date = r.date.toString(),
                totalValue = r.totalValue,
                dailyPnl = r.dailyPnl,
            )
        }
        return PortfolioHistoryResponse(range = range, points = points)
    }
}
