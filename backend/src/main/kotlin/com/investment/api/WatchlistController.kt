package com.investment.api

import com.investment.api.dto.AddToPortfolioRequest
import com.investment.api.dto.AddWatchlistItemRequest
import com.investment.api.dto.TransactionResponse
import com.investment.api.dto.WatchlistItemResponse
import com.investment.api.dto.WatchlistMetricsResponse
import com.investment.application.WatchlistAnalysisService
import com.investment.application.WatchlistService
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
@RequestMapping("/api/watchlist")
class WatchlistController(
    private val watchlistService: WatchlistService,
    private val watchlistAnalysisService: WatchlistAnalysisService
) {

    @GetMapping
    fun listItems(): ResponseEntity<List<WatchlistItemResponse>> {
        return ResponseEntity.ok(watchlistService.listItems())
    }

    @PostMapping
    fun addItem(@RequestBody request: AddWatchlistItemRequest): ResponseEntity<WatchlistItemResponse> {
        val item = watchlistService.addItem(request)
        return ResponseEntity.status(201).body(item)
    }

    @DeleteMapping("/{id}")
    fun removeItem(@PathVariable id: UUID): ResponseEntity<Void> {
        watchlistService.removeItem(id)
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/{id}/metrics")
    fun getMetrics(@PathVariable id: UUID): ResponseEntity<WatchlistMetricsResponse> {
        return ResponseEntity.ok(watchlistService.getMetrics(id))
    }

    @PostMapping("/{id}/add-to-portfolio")
    fun addToPortfolio(
        @PathVariable id: UUID,
        @RequestBody request: AddToPortfolioRequest
    ): ResponseEntity<TransactionResponse> {
        val transaction = watchlistService.addToPortfolio(id, request.amount)
        return ResponseEntity.status(201).body(transaction)
    }

    @PostMapping("/{id}/analyze")
    fun analyzeItem(@PathVariable id: UUID): ResponseEntity<WatchlistItemResponse> {
        val item = watchlistAnalysisService.analyze(id)
        return ResponseEntity.ok(item)
    }
}
