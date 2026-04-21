package com.investment.application

import com.investment.domain.ConflictException
import com.investment.domain.EmailNotVerifiedException
import com.investment.domain.RateLimitException
import com.investment.domain.UnauthorizedException
import com.investment.infrastructure.UserRecord
import com.investment.infrastructure.UserRepository
import com.investment.infrastructure.VerificationTokenRecord
import com.investment.infrastructure.VerificationTokenRepository
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.kotlin.*
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import java.time.Clock
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.util.UUID

class UserServiceTest {

    private val userRepository = mock<UserRepository>()
    private val tokenRepository = mock<VerificationTokenRepository>()
    private val emailService = mock<EmailService>()
    private val fixedClock = Clock.fixed(Instant.parse("2026-04-21T12:00:00Z"), ZoneId.of("UTC"))
    private val encoder = BCryptPasswordEncoder()

    private val service = UserService(
        userRepository, tokenRepository, emailService, fixedClock, registrationEnabled = true
    )

    // --- Registration ---

    @Test
    fun `register creates unverified user, sends verification email, returns message`() {
        val userId = UUID.randomUUID()
        whenever(userRepository.findByEmail("alice@example.com")).thenReturn(null)
        whenever(userRepository.insert(eq("alice@example.com"), any())).thenReturn(userId)
        whenever(tokenRepository.insert(eq(userId), any(), eq("VERIFY_EMAIL"), any())).thenReturn(UUID.randomUUID())

        val message = service.register("alice@example.com", "secret123")

        assertEquals("Check your email to verify your account", message)
        verify(emailService).sendVerificationEmail(eq("alice@example.com"), any())
    }

    @Test
    fun `register throws ConflictException when email already registered`() {
        whenever(userRepository.findByEmail("alice@example.com")).thenReturn(
            UserRecord(UUID.randomUUID(), "alice@example.com", "hash", false)
        )

        assertThrows<ConflictException> {
            service.register("alice@example.com", "password123")
        }
    }

    @Test
    fun `register throws IllegalArgumentException for invalid email`() {
        assertThrows<IllegalArgumentException> { service.register("not-an-email", "password123") }
    }

    @Test
    fun `register throws IllegalArgumentException for short password`() {
        assertThrows<IllegalArgumentException> { service.register("alice@example.com", "short") }
    }

    @Test
    fun `register throws UnauthorizedException when registration is disabled`() {
        val disabledService = UserService(
            userRepository, tokenRepository, emailService, fixedClock, registrationEnabled = false
        )
        assertThrows<UnauthorizedException> {
            disabledService.register("alice@example.com", "password123")
        }
    }

    // --- Email Verification ---

    @Test
    fun `verifyEmail sets email_verified for valid unexpired token`() {
        val userId = UUID.randomUUID()
        val tokenRecord = VerificationTokenRecord(
            id = UUID.randomUUID(),
            userId = userId,
            token = "abc123",
            tokenType = "VERIFY_EMAIL",
            expiresAt = LocalDateTime.now(fixedClock).plusMinutes(30),
            createdAt = LocalDateTime.now(fixedClock).minusMinutes(10)
        )
        whenever(tokenRepository.findByToken("abc123")).thenReturn(tokenRecord)

        service.verifyEmail("abc123")

        verify(userRepository).setEmailVerified(userId)
        verify(tokenRepository).deleteByToken("abc123")
    }

    @Test
    fun `verifyEmail throws for expired token`() {
        val tokenRecord = VerificationTokenRecord(
            id = UUID.randomUUID(),
            userId = UUID.randomUUID(),
            token = "expired",
            tokenType = "VERIFY_EMAIL",
            expiresAt = LocalDateTime.now(fixedClock).minusMinutes(1),
            createdAt = LocalDateTime.now(fixedClock).minusHours(2)
        )
        whenever(tokenRepository.findByToken("expired")).thenReturn(tokenRecord)

        assertThrows<IllegalArgumentException> { service.verifyEmail("expired") }
    }

    @Test
    fun `verifyEmail throws for nonexistent token`() {
        whenever(tokenRepository.findByToken("nope")).thenReturn(null)
        assertThrows<IllegalArgumentException> { service.verifyEmail("nope") }
    }

    // --- Login ---

    @Test
    fun `login returns AuthResponse for verified user with correct password`() {
        val userId = UUID.randomUUID()
        val hash = encoder.encode("correct-password")
        whenever(userRepository.findByEmail("alice@example.com")).thenReturn(
            UserRecord(userId, "alice@example.com", hash, true)
        )

        val result = service.login("alice@example.com", "correct-password")

        assertEquals(userId, result.userId)
        assertEquals("alice@example.com", result.email)
    }

    @Test
    fun `login throws EmailNotVerifiedException for unverified user`() {
        val hash = encoder.encode("correct-password")
        whenever(userRepository.findByEmail("alice@example.com")).thenReturn(
            UserRecord(UUID.randomUUID(), "alice@example.com", hash, false)
        )

        assertThrows<EmailNotVerifiedException> {
            service.login("alice@example.com", "correct-password")
        }
    }

    @Test
    fun `login throws UnauthorizedException for wrong password`() {
        val hash = encoder.encode("real-password")
        whenever(userRepository.findByEmail("alice@example.com")).thenReturn(
            UserRecord(UUID.randomUUID(), "alice@example.com", hash, true)
        )

        assertThrows<UnauthorizedException> {
            service.login("alice@example.com", "wrong-password")
        }
    }

    @Test
    fun `login throws UnauthorizedException for unknown email`() {
        whenever(userRepository.findByEmail("nobody@example.com")).thenReturn(null)

        assertThrows<UnauthorizedException> {
            service.login("nobody@example.com", "anything")
        }
    }

    // --- Resend Verification ---

    @Test
    fun `resendVerification sends new email for unverified user`() {
        val userId = UUID.randomUUID()
        whenever(userRepository.findByEmail("alice@example.com")).thenReturn(
            UserRecord(userId, "alice@example.com", "hash", false)
        )
        whenever(tokenRepository.findLatestByUserIdAndType(userId, "VERIFY_EMAIL")).thenReturn(null)
        whenever(tokenRepository.insert(eq(userId), any(), eq("VERIFY_EMAIL"), any())).thenReturn(UUID.randomUUID())

        service.resendVerification("alice@example.com")

        verify(tokenRepository).deleteByUserIdAndType(userId, "VERIFY_EMAIL")
        verify(emailService).sendVerificationEmail(eq("alice@example.com"), any())
    }

    @Test
    fun `resendVerification does nothing for unknown email (no enumeration)`() {
        whenever(userRepository.findByEmail("nobody@example.com")).thenReturn(null)

        service.resendVerification("nobody@example.com")

        verifyNoInteractions(emailService)
    }

    @Test
    fun `resendVerification throws RateLimitException if token created less than 2 minutes ago`() {
        val userId = UUID.randomUUID()
        whenever(userRepository.findByEmail("alice@example.com")).thenReturn(
            UserRecord(userId, "alice@example.com", "hash", false)
        )
        val recentToken = VerificationTokenRecord(
            id = UUID.randomUUID(),
            userId = userId,
            token = "recent",
            tokenType = "VERIFY_EMAIL",
            expiresAt = LocalDateTime.now(fixedClock).plusMinutes(59),
            createdAt = LocalDateTime.now(fixedClock).minusSeconds(30)
        )
        whenever(tokenRepository.findLatestByUserIdAndType(userId, "VERIFY_EMAIL")).thenReturn(recentToken)

        assertThrows<RateLimitException> {
            service.resendVerification("alice@example.com")
        }
    }

    // --- Password Reset ---

    @Test
    fun `forgotPassword sends reset email for verified user`() {
        val userId = UUID.randomUUID()
        whenever(userRepository.findByEmail("alice@example.com")).thenReturn(
            UserRecord(userId, "alice@example.com", "hash", true)
        )
        whenever(tokenRepository.insert(eq(userId), any(), eq("RESET_PASSWORD"), any())).thenReturn(UUID.randomUUID())

        service.forgotPassword("alice@example.com")

        verify(emailService).sendPasswordResetEmail(eq("alice@example.com"), any())
    }

    @Test
    fun `forgotPassword does nothing for unknown email (no enumeration)`() {
        whenever(userRepository.findByEmail("nobody@example.com")).thenReturn(null)

        service.forgotPassword("nobody@example.com")

        verifyNoInteractions(emailService)
    }

    @Test
    fun `resetPassword updates hash for valid token`() {
        val userId = UUID.randomUUID()
        val tokenRecord = VerificationTokenRecord(
            id = UUID.randomUUID(),
            userId = userId,
            token = "reset-tok",
            tokenType = "RESET_PASSWORD",
            expiresAt = LocalDateTime.now(fixedClock).plusMinutes(30),
            createdAt = LocalDateTime.now(fixedClock).minusMinutes(5)
        )
        whenever(tokenRepository.findByToken("reset-tok")).thenReturn(tokenRecord)

        service.resetPassword("reset-tok", "newpassword123")

        verify(userRepository).updatePasswordHash(eq(userId), any())
        verify(tokenRepository).deleteByToken("reset-tok")
    }

    @Test
    fun `resetPassword throws for expired token`() {
        val tokenRecord = VerificationTokenRecord(
            id = UUID.randomUUID(),
            userId = UUID.randomUUID(),
            token = "expired-reset",
            tokenType = "RESET_PASSWORD",
            expiresAt = LocalDateTime.now(fixedClock).minusMinutes(1),
            createdAt = LocalDateTime.now(fixedClock).minusHours(2)
        )
        whenever(tokenRepository.findByToken("expired-reset")).thenReturn(tokenRecord)

        assertThrows<IllegalArgumentException> { service.resetPassword("expired-reset", "newpassword123") }
    }

    @Test
    fun `resetPassword throws for short new password`() {
        assertThrows<IllegalArgumentException> { service.resetPassword("any-token", "short") }
    }
}
