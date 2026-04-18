package com.investment.api

import com.investment.api.dto.HoldingDashboardResponse
import com.investment.api.dto.HoldingsHistoryResponse
import com.investment.api.dto.OhlcBarResponse
import com.investment.api.dto.OhlcResponse
import com.investment.api.dto.PortfolioDataPoint
import com.investment.api.dto.PortfolioHistoryResponse
import com.investment.api.dto.PortfolioSummaryResponse
import com.investment.application.HoldingsHistoryService
import com.investment.application.MarketDataService
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
    private val holdingsHistoryService: HoldingsHistoryService,
    private val marketDataService: MarketDataService,
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

    @GetMapping("/holdings-history")
    fun getHoldingsHistory(
        @RequestParam(defaultValue = "1M") range: String
    ): HoldingsHistoryResponse {
        return holdingsHistoryService.getHoldingsHistory(range)
    }

    @GetMapping("/ohlc")
    fun getOhlc(
        @RequestParam symbol: String,
        @RequestParam(defaultValue = "ALL") range: String,
    ): OhlcResponse {
        val today = LocalDate.now(clock)
        val from = when (range) {
            "1W"  -> today.minusDays(7)
            "1M"  -> today.minusDays(30)
            "3M"  -> today.minusDays(90)
            "6M"  -> today.minusDays(180)
            "1Y"  -> today.minusDays(365)
            "5Y"  -> today.minusYears(5)
            "10Y" -> today.minusYears(10)
            "ALL", "MAX" -> today.minusYears(30)
            else  -> today.minusYears(30)
        }
        val currency = try { marketDataService.getQuote(symbol).currency } catch (_: Exception) { "USD" }
        val bars = marketDataService.getOhlcBars(symbol, from, today)
        return OhlcResponse(
            symbol = symbol.uppercase(),
            currency = currency,
            bars = bars.map { OhlcBarResponse(it.date.toString(), it.open, it.high, it.low, it.close, it.volume) },
        )
    }
}
