package com.investment.api

import com.investment.api.dto.OptionsTransactionRequest
import com.investment.api.dto.UpdateOptionsStatusRequest
import com.investment.application.OptionsTransactionService
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
@RequestMapping("/api/options")
class OptionsController(private val optionsService: OptionsTransactionService) {

    @GetMapping
    fun list() = ResponseEntity.ok(optionsService.listAll())

    @PostMapping
    fun create(@RequestBody request: OptionsTransactionRequest) =
        ResponseEntity.ok(optionsService.create(request))

    @PutMapping("/{id}/status")
    fun updateStatus(
        @PathVariable id: UUID,
        @RequestBody request: UpdateOptionsStatusRequest
    ) = ResponseEntity.ok(optionsService.updateStatus(id, request))

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: UUID): ResponseEntity<Void> {
        optionsService.delete(id)
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/{symbol}/strategy")
    fun getStrategy(@PathVariable symbol: String) =
        ResponseEntity.ok(optionsService.getStrategy(symbol))
}
