package com.investment.api

import com.investment.api.dto.AnalyticsBenchmark
import com.investment.api.dto.AnalyticsResponse
import com.investment.api.dto.MonthlyReturnsResponse
import com.investment.application.AnalyticsService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.Clock
import java.time.LocalDate

@RestController
@RequestMapping("/api/analytics")
class AnalyticsController(
    private val analyticsService: AnalyticsService,
    private val clock: Clock
) {

    @GetMapping
    fun getAnalytics(
        @RequestParam(defaultValue = "3M") range: String
    ): ResponseEntity<AnalyticsResponse> {
        return ResponseEntity.ok(analyticsService.getAnalytics(range))
    }

    @GetMapping("/monthly-returns")
    fun getMonthlyReturns(@RequestParam(defaultValue = "1Y") range: String): ResponseEntity<MonthlyReturnsResponse> {
        return ResponseEntity.ok(analyticsService.getMonthlyReturns(range))
    }

    @GetMapping("/benchmark")
    fun getBenchmark(
        @RequestParam(defaultValue = "SPY") symbol: String,
        @RequestParam(defaultValue = "1Y") range: String
    ): ResponseEntity<AnalyticsBenchmark?> {
        val today = LocalDate.now(clock)
        val from = when (range) {
            "1M" -> today.minusDays(30)
            "3M" -> today.minusDays(90)
            "6M" -> today.minusDays(180)
            "1Y" -> today.minusDays(365)
            else -> today.minusDays(365)
        }
        val result = analyticsService.getBenchmarkStandalone(symbol, from, today)
        return ResponseEntity.ok(result)
    }
}
