package com.investment.domain

class EmailNotVerifiedException(
    message: String = "Email not verified"
) : RuntimeException(message)
