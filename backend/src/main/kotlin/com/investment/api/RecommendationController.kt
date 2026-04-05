package com.investment.api

import com.investment.api.dto.RecommendationsResponse
import com.investment.application.RecommendationService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/recommendations")
class RecommendationController(
    private val recommendationService: RecommendationService
) {

    @GetMapping
    fun getRecommendations(): ResponseEntity<RecommendationsResponse> {
        return ResponseEntity.ok(recommendationService.getRecommendations())
    }

    @PostMapping("/refresh")
    fun forceRefresh(): ResponseEntity<RecommendationsResponse> {
        return ResponseEntity.ok(recommendationService.forceRefresh())
    }
}
