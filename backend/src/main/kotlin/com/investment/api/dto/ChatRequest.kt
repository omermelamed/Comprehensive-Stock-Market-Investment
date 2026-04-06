package com.investment.api.dto

data class ChatTurn(
    val role: String,    // "user" | "assistant"
    val content: String
)

data class ChatRequest(
    val message: String,
    val history: List<ChatTurn> = emptyList()
)
