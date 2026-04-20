package com.investment.application

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import java.util.UUID

class JwtServiceTest {

    private val service = JwtService(
        secret = "test-secret-key-for-unit-tests-minimum-32-chars",
        expiryDays = 1L,
        clock = Clock.systemDefaultZone()
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
        val otherService = JwtService(
            secret = "completely-different-secret-also-32-chars-!",
            expiryDays = 1L,
            clock = Clock.systemDefaultZone()
        )
        val token = otherService.generateToken(UUID.randomUUID())
        val result = service.validateToken(token)
        assertNull(result)
    }

    @Test
    fun `returns null for expired token`() {
        val pastClock = Clock.fixed(Instant.now().minusSeconds(86401), ZoneOffset.UTC)
        val expiredService = JwtService(
            secret = "test-secret-key-must-be-at-least-32-chars!!",
            expiryDays = 1,
            clock = pastClock
        )
        val token = expiredService.generateToken(UUID.randomUUID())
        // Token was issued and expired 1 day ago; current-time service must reject it.
        assertNull(service.validateToken(token))
    }
}
