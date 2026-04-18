package com.investment.api

import com.investment.api.dto.SellPreviewResponse
import com.investment.api.dto.SellRequest
import com.investment.api.dto.SellResponse
import com.investment.application.SellService
import com.investment.application.SellValidationException
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.math.BigDecimal

@RestController
@RequestMapping("/api")
class SellController(
    private val sellService: SellService
) {

    @GetMapping("/holdings/{symbol}/sell-preview")
    fun getSellPreview(
        @PathVariable symbol: String,
        @RequestParam(required = false) quantity: BigDecimal?,
        @RequestParam(required = false) price: BigDecimal?,
        @RequestParam(required = false) date: String?
    ): ResponseEntity<SellPreviewResponse> {
        return ResponseEntity.ok(sellService.getSellPreview(symbol, quantity, price, date))
    }

    @PostMapping("/transactions/sell")
    fun executeSell(@RequestBody request: SellRequest): ResponseEntity<Any> {
        return try {
            val response = sellService.executeSell(request)
            ResponseEntity.status(201).body(response as Any)
        } catch (e: SellValidationException) {
            val status = when (e.errorCode) {
                "DUPLICATE_TRANSACTION" -> 409
                else -> 400
            }
            val body = mutableMapOf<String, Any>(
                "error" to e.errorCode,
                "message" to e.message
            )
            if (e.sharesHeldAtDate != null) {
                body["sharesHeldAtDate"] = e.sharesHeldAtDate
            }
            ResponseEntity.status(status).body(body as Any)
        } catch (e: Exception) {
            val message = e.message ?: "An unexpected error occurred while processing the sale"
            ResponseEntity.status(500).body(mapOf(
                "error" to "INTERNAL_ERROR",
                "message" to message
            ) as Any)
        }
    }
}
