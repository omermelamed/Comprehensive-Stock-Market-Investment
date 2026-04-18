package com.investment.api

import com.investment.api.dto.RecalculationStatusResponse
import com.investment.application.RecalculationService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/recalculation")
class RecalculationController(
    private val recalculationService: RecalculationService
) {

    @GetMapping("/status")
    fun getStatus(): ResponseEntity<RecalculationStatusResponse> {
        return ResponseEntity.ok(recalculationService.getStatus())
    }

    @PostMapping("/retry")
    fun retry(@RequestBody body: Map<String, String>): ResponseEntity<RecalculationStatusResponse> {
        val jobIdStr = body["jobId"] ?: body["job_id"]
            ?: throw IllegalArgumentException("job_id is required")
        val jobId = UUID.fromString(jobIdStr)
        return ResponseEntity.ok(recalculationService.retryJob(jobId))
    }
}
