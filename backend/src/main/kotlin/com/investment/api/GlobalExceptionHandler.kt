package com.investment.api

import com.investment.domain.ConflictException
import com.investment.domain.UnauthorizedException
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class GlobalExceptionHandler {

    private val log = LoggerFactory.getLogger(GlobalExceptionHandler::class.java)

    @ExceptionHandler(UnauthorizedException::class)
    fun handleUnauthorized(ex: UnauthorizedException): ResponseEntity<Map<String, String?>> {
        return ResponseEntity.status(401).body(mapOf("error" to ex.message))
    }

    @ExceptionHandler(ConflictException::class)
    fun handleConflict(ex: ConflictException): ResponseEntity<Map<String, String?>> {
        return ResponseEntity.status(409).body(mapOf("error" to ex.message))
    }

    @ExceptionHandler(IllegalArgumentException::class)
    fun handleIllegalArgument(ex: IllegalArgumentException): ResponseEntity<Map<String, String?>> {
        log.warn("Bad request: ${ex.message}")
        return ResponseEntity.badRequest().body(mapOf("error" to ex.message))
    }

    @ExceptionHandler(NoSuchElementException::class)
    fun handleNotFound(ex: NoSuchElementException): ResponseEntity<Map<String, String?>> {
        log.warn("Not found: ${ex.message}")
        return ResponseEntity.status(404).body(mapOf("error" to ex.message))
    }

    @ExceptionHandler(Exception::class)
    fun handleGeneric(ex: Exception): ResponseEntity<Map<String, String?>> {
        log.error("Unexpected error", ex)
        return ResponseEntity.status(500).body(mapOf("error" to "An unexpected error occurred"))
    }
}
