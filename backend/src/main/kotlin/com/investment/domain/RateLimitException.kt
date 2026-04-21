package com.investment.domain

class RateLimitException(
    message: String = "Too many requests"
) : RuntimeException(message)
