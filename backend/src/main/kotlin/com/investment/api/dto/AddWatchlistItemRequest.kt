package com.investment.api.dto

data class AddWatchlistItemRequest(
    val symbol: String,
    val assetType: String = "STOCK"
)
