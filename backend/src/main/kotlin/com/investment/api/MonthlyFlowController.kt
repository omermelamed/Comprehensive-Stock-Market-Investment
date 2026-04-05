package com.investment.api

import com.investment.api.dto.MonthlyFlowConfirmRequest
import com.investment.api.dto.MonthlyFlowConfirmResponse
import com.investment.api.dto.MonthlyFlowPreviewRequest
import com.investment.api.dto.MonthlyFlowPreviewResponse
import com.investment.api.dto.MonthlyFlowSummariesRequest
import com.investment.api.dto.PositionSummaryResponse
import com.investment.application.AiSummaryService
import com.investment.application.MonthlyInvestmentService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/monthly-flow")
class MonthlyFlowController(
    private val monthlyInvestmentService: MonthlyInvestmentService,
    private val aiSummaryService: AiSummaryService
) {

    @PostMapping("/preview")
    fun preview(@RequestBody request: MonthlyFlowPreviewRequest): ResponseEntity<MonthlyFlowPreviewResponse> {
        return ResponseEntity.ok(monthlyInvestmentService.preview(request))
    }

    @PostMapping("/confirm")
    fun confirm(@RequestBody request: MonthlyFlowConfirmRequest): ResponseEntity<MonthlyFlowConfirmResponse> {
        return ResponseEntity.ok(monthlyInvestmentService.confirm(request))
    }

    @PostMapping("/summaries")
    fun summaries(@RequestBody request: MonthlyFlowSummariesRequest): ResponseEntity<List<PositionSummaryResponse>> {
        return ResponseEntity.ok(aiSummaryService.generateSummaries(request))
    }
}
