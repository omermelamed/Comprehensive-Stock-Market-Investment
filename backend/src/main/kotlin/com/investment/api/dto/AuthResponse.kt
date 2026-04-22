package com.investment.api.dto

import java.util.UUID

data class AuthResponse(
    val userId: UUID,
    val email: String,
    val token: String? = null
)
