package com.investment.api

import com.investment.api.dto.RiskThresholdsRequest
import com.investment.application.RiskService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/risk")
class RiskController(private val riskService: RiskService) {

    @GetMapping("/metrics")
    fun getMetrics() = ResponseEntity.ok(riskService.getRiskMetrics())

    @GetMapping("/warnings")
    fun getWarnings() = ResponseEntity.ok(riskService.getRiskWarnings())

    @GetMapping("/thresholds")
    fun getThresholds() = ResponseEntity.ok(riskService.getThresholds())

    @PutMapping("/thresholds")
    fun updateThresholds(@RequestBody request: RiskThresholdsRequest) =
        ResponseEntity.ok(riskService.updateThresholds(request))
}
