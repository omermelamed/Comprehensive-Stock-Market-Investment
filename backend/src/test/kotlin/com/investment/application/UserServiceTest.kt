package com.investment.application

import com.investment.domain.ConflictException
import com.investment.domain.UnauthorizedException
import com.investment.infrastructure.UserRecord
import com.investment.infrastructure.UserRepository
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import java.util.UUID

class UserServiceTest {

    private val userRepository = mock<UserRepository>()
    private val service = UserService(userRepository, registrationEnabled = true)

    @Test
    fun `register creates user and returns userId and username`() {
        val userId = UUID.randomUUID()
        whenever(userRepository.findByUsername("alice")).thenReturn(null)
        whenever(userRepository.insert(any(), any())).thenReturn(userId)

        val result = service.register("alice", "secret123")

        assertEquals("alice", result.username)
        assertEquals(userId, result.userId)
    }

    @Test
    fun `register throws ConflictException when username already taken`() {
        whenever(userRepository.findByUsername("alice")).thenReturn(
            UserRecord(UUID.randomUUID(), "alice", "hash")
        )

        assertThrows<ConflictException> {
            service.register("alice", "password")
        }
    }

    @Test
    fun `login returns userId and username for correct credentials`() {
        val userId = UUID.randomUUID()
        val password = "correct-password"
        val hash = org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode(password)
        whenever(userRepository.findByUsername("alice")).thenReturn(
            UserRecord(userId, "alice", hash)
        )

        val result = service.login("alice", password)

        assertEquals(userId, result.userId)
        assertEquals("alice", result.username)
    }

    @Test
    fun `login throws UnauthorizedException for wrong password`() {
        val hash = org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode("real-password")
        whenever(userRepository.findByUsername("alice")).thenReturn(
            UserRecord(UUID.randomUUID(), "alice", hash)
        )

        assertThrows<UnauthorizedException> {
            service.login("alice", "wrong-password")
        }
    }

    @Test
    fun `login throws UnauthorizedException for unknown username`() {
        whenever(userRepository.findByUsername("nobody")).thenReturn(null)

        assertThrows<UnauthorizedException> {
            service.login("nobody", "anything")
        }
    }

    @Test
    fun `register throws IllegalArgumentException for username shorter than 3 characters`() {
        assertThrows<IllegalArgumentException> { service.register("ab", "password123") }
    }

    @Test
    fun `register throws IllegalArgumentException for password shorter than 8 characters`() {
        assertThrows<IllegalArgumentException> { service.register("alice", "short") }
    }

    @Test
    fun `register throws UnauthorizedException when registration is disabled`() {
        val disabledService = UserService(userRepository, registrationEnabled = false)
        assertThrows<UnauthorizedException> { disabledService.register("alice", "password123") }
    }
}
