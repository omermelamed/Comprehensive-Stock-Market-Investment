package com.investment.application

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import java.util.UUID

class JwtServiceTest {

    private val service = JwtService(
        secret = "test-secret-key-for-unit-tests-minimum-32-chars",
        expiryDays = 1L
    )

    @Test
    fun `generateToken produces token that validateToken parses back to same userId`() {
        val userId = UUID.randomUUID()
        val token = service.generateToken(userId)
        val parsed = service.validateToken(token)
        assertEquals(userId, parsed)
    }

    @Test
    fun `validateToken returns null for garbage input`() {
        val result = service.validateToken("not-a-jwt")
        assertNull(result)
    }

    @Test
    fun `validateToken returns null for token signed with wrong secret`() {
        val otherService = JwtService("completely-different-secret-also-32-chars-!", 1L)
        val token = otherService.generateToken(UUID.randomUUID())
        val result = service.validateToken(token)
        assertNull(result)
    }
}
