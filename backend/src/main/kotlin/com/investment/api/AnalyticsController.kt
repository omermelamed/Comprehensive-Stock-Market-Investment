package com.investment.api

import com.investment.api.dto.AnalyticsResponse
import com.investment.application.AnalyticsService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/analytics")
class AnalyticsController(private val analyticsService: AnalyticsService) {

    @GetMapping
    fun getAnalytics(
        @RequestParam(defaultValue = "3M") range: String
    ): ResponseEntity<AnalyticsResponse> {
        return ResponseEntity.ok(analyticsService.getAnalytics(range))
    }
}
