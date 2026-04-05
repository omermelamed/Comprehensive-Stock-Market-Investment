package com.investment.application

import com.investment.api.dto.AddWatchlistItemRequest
import com.investment.api.dto.WatchlistItemResponse
import com.investment.infrastructure.WatchlistRepository
import org.springframework.stereotype.Service

@Service
class WatchlistService(
    private val watchlistRepository: WatchlistRepository
) {

    fun listItems(): List<WatchlistItemResponse> {
        return watchlistRepository.findAll()
    }

    fun addItem(request: AddWatchlistItemRequest): WatchlistItemResponse {
        require(request.symbol.isNotBlank()) { "Symbol must not be blank" }
        return watchlistRepository.insert(request.symbol, request.assetType)
    }

    fun removeItem(id: java.util.UUID) {
        watchlistRepository.delete(id)
    }
}
