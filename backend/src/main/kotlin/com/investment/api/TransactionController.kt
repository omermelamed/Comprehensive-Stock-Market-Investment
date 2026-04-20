package com.investment.api

import com.investment.api.dto.TransactionRequest
import com.investment.api.dto.TransactionResponse
import com.investment.application.TransactionService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/transactions")
class TransactionController(
    private val transactionService: TransactionService
) {

    @GetMapping
    fun getTransactions(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int
    ): ResponseEntity<Map<String, Any>> {
        return ResponseEntity.ok(transactionService.getTransactions(page, size))
    }

    @PostMapping
    fun addTransaction(@RequestBody request: TransactionRequest): ResponseEntity<TransactionResponse> {
        val transaction = transactionService.addTransaction(request)
        return ResponseEntity.status(201).body(transaction)
    }

    @PutMapping("/{id}")
    fun updateTransaction(
        @PathVariable id: UUID,
        @RequestBody request: TransactionRequest
    ): ResponseEntity<TransactionResponse> {
        val updated = transactionService.updateTransaction(id, request)
        return ResponseEntity.ok(updated)
    }

    @DeleteMapping("/{id}")
    fun deleteTransaction(@PathVariable id: UUID): ResponseEntity<Void> {
        transactionService.deleteTransaction(id)
        return ResponseEntity.noContent().build()
    }
}
