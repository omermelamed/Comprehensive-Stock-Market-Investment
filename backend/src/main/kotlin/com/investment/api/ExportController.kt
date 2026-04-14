package com.investment.api

import com.investment.application.ExportService
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/export")
class ExportController(
    private val exportService: ExportService
) {

    @GetMapping("/holdings")
    fun exportHoldings(
        @RequestParam(defaultValue = "csv") format: String
    ): ResponseEntity<ByteArray> {
        val bytes = exportService.exportHoldings(format)
        return download(bytes, "holdings", format)
    }

    @GetMapping("/transactions")
    fun exportTransactions(
        @RequestParam(defaultValue = "csv") format: String
    ): ResponseEntity<ByteArray> {
        val bytes = exportService.exportTransactions(format)
        return download(bytes, "transactions", format)
    }

    @GetMapping("/performance")
    fun exportPerformance(
        @RequestParam(defaultValue = "csv") format: String
    ): ResponseEntity<ByteArray> {
        val bytes = exportService.exportPerformance(format)
        return download(bytes, "performance", format)
    }

    private fun download(bytes: ByteArray, name: String, format: String): ResponseEntity<ByteArray> {
        val (contentType, extension) = when (format.lowercase()) {
            "xlsx" -> MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") to "xlsx"
            else   -> MediaType.parseMediaType("text/csv") to "csv"
        }
        val filename = "$name.$extension"
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"$filename\"")
            .contentType(contentType)
            .body(bytes)
    }
}
