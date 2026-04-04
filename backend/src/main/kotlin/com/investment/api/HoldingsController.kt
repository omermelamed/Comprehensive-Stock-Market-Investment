package com.investment.api

import com.investment.api.dto.HoldingResponse
import com.investment.infrastructure.HoldingsProjectionRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/holdings")
class HoldingsController(
    private val holdingsProjectionRepository: HoldingsProjectionRepository
) {

    @GetMapping
    fun getHoldings(): ResponseEntity<List<HoldingResponse>> {
        return ResponseEntity.ok(holdingsProjectionRepository.findAll())
    }
}
