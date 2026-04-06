package com.investment.api

import com.investment.api.dto.AlertResponse
import com.investment.api.dto.CreateAlertRequest
import com.investment.application.AlertService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/alerts")
class AlertController(private val alertService: AlertService) {

    @GetMapping
    fun listAlerts(): ResponseEntity<List<AlertResponse>> {
        return ResponseEntity.ok(alertService.listAlerts())
    }

    @PostMapping
    fun createAlert(@RequestBody request: CreateAlertRequest): ResponseEntity<AlertResponse> {
        val alert = alertService.createAlert(request)
        return ResponseEntity.status(201).body(alert)
    }

    @DeleteMapping("/{id}")
    fun deleteAlert(@PathVariable id: UUID): ResponseEntity<Void> {
        alertService.deleteAlert(id)
        return ResponseEntity.noContent().build()
    }
}
