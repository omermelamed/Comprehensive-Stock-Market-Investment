package com.investment.api

import com.investment.api.dto.AlertResponse
import com.investment.api.dto.CreateAlertRequest
import com.investment.application.AlertService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
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

    @PutMapping("/{id}")
    fun updateAlert(
        @PathVariable id: UUID,
        @RequestBody request: CreateAlertRequest
    ): ResponseEntity<AlertResponse> {
        return ResponseEntity.ok(alertService.updateAlert(id, request))
    }

    @DeleteMapping("/{id}")
    fun deleteAlert(@PathVariable id: UUID): ResponseEntity<Void> {
        alertService.deleteAlert(id)
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/unread-count")
    fun unreadCount(): ResponseEntity<Map<String, Int>> {
        return ResponseEntity.ok(mapOf("count" to alertService.countUnread()))
    }

    @PostMapping("/{id}/dismiss")
    fun dismiss(@PathVariable id: UUID): ResponseEntity<Void> {
        alertService.dismissAlert(id)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/{id}/re-enable")
    fun reEnable(@PathVariable id: UUID): ResponseEntity<AlertResponse> {
        alertService.reEnableAlert(id)
        return ResponseEntity.ok(alertService.listAlerts().first { it.id == id })
    }
}
