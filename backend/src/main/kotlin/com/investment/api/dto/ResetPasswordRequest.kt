package com.investment.api.dto

data class ResetPasswordRequest(
    val token: String,
    val newPassword: String
)
