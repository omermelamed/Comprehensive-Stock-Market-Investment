package com.investment.api

import com.investment.api.dto.ScheduledMessageLogEntry
import com.investment.api.dto.ScheduledMessageRequest
import com.investment.api.dto.ScheduledMessageResponse
import com.investment.application.WhatsAppScheduledMessageService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/whatsapp/schedules")
class WhatsAppSchedulesController(private val service: WhatsAppScheduledMessageService) {

    @GetMapping
    fun list(): ResponseEntity<List<ScheduledMessageResponse>> =
        ResponseEntity.ok(service.list())

    @PostMapping
    fun create(@RequestBody request: ScheduledMessageRequest): ResponseEntity<ScheduledMessageResponse> =
        ResponseEntity.ok(service.create(request))

    @PutMapping("/{id}")
    fun update(
        @PathVariable id: UUID,
        @RequestBody request: ScheduledMessageRequest
    ): ResponseEntity<ScheduledMessageResponse> =
        ResponseEntity.ok(service.update(id, request))

    @PatchMapping("/{id}/toggle")
    fun toggle(
        @PathVariable id: UUID,
        @RequestBody body: Map<String, Boolean>
    ): ResponseEntity<ScheduledMessageResponse> {
        val isActive = body["isActive"]
            ?: return ResponseEntity.badRequest().build()
        return ResponseEntity.ok(service.toggle(id, isActive))
    }

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: UUID): ResponseEntity<Void> {
        service.delete(id)
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/{id}/history")
    fun history(@PathVariable id: UUID): ResponseEntity<List<ScheduledMessageLogEntry>> =
        ResponseEntity.ok(service.getHistory(id))
}
