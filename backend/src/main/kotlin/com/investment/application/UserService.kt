package com.investment.application

import com.investment.api.dto.AuthResponse
import com.investment.domain.ConflictException
import com.investment.domain.EmailNotVerifiedException
import com.investment.domain.RateLimitException
import com.investment.domain.UnauthorizedException
import com.investment.infrastructure.UserRepository
import com.investment.infrastructure.VerificationTokenRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.stereotype.Service
import java.security.SecureRandom
import java.time.Clock
import java.time.LocalDateTime
import java.util.UUID

@Service
class UserService(
    private val userRepository: UserRepository,
    private val tokenRepository: VerificationTokenRepository,
    private val emailService: EmailService,
    private val clock: Clock,
    @Value("\${app.registration.enabled:true}") private val registrationEnabled: Boolean
) {

    private val encoder = BCryptPasswordEncoder()
    private val secureRandom = SecureRandom()

    fun register(email: String, password: String): String {
        if (!registrationEnabled) {
            throw UnauthorizedException("Public registration is disabled")
        }
        require(email.matches(Regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$"))) { "Invalid email format" }
        require(password.length >= 8) { "Password must be at least 8 characters" }

        if (userRepository.findByEmail(email) != null) {
            throw ConflictException("Email already registered")
        }

        val hash = encoder.encode(password)
        val userId = userRepository.insert(email, hash)

        val token = generateToken()
        val expiresAt = LocalDateTime.now(clock).plusHours(1)
        tokenRepository.insert(userId, token, "VERIFY_EMAIL", expiresAt)
        emailService.sendVerificationEmail(email, token)

        return "Check your email to verify your account"
    }

    fun verifyEmail(token: String) {
        val record = tokenRepository.findByToken(token)
            ?: throw IllegalArgumentException("Invalid or expired verification link")

        if (record.tokenType != "VERIFY_EMAIL") {
            throw IllegalArgumentException("Invalid or expired verification link")
        }
        if (record.expiresAt.isBefore(LocalDateTime.now(clock))) {
            tokenRepository.deleteByToken(token)
            throw IllegalArgumentException("Verification link has expired")
        }

        userRepository.setEmailVerified(record.userId)
        tokenRepository.deleteByToken(token)
    }

    fun login(email: String, password: String): AuthResponse {
        val user = userRepository.findByEmail(email)
            ?: throw UnauthorizedException("Invalid email or password")
        if (!encoder.matches(password, user.passwordHash)) {
            throw UnauthorizedException("Invalid email or password")
        }
        if (!user.emailVerified) {
            throw EmailNotVerifiedException("Please verify your email before signing in")
        }
        return AuthResponse(userId = user.id, email = user.email)
    }

    fun resendVerification(email: String) {
        val user = userRepository.findByEmail(email) ?: return
        if (user.emailVerified) return

        val latest = tokenRepository.findLatestByUserIdAndType(user.id, "VERIFY_EMAIL")
        if (latest != null && latest.createdAt.isAfter(LocalDateTime.now(clock).minusMinutes(2))) {
            throw RateLimitException("Please wait before requesting another verification email")
        }

        tokenRepository.deleteByUserIdAndType(user.id, "VERIFY_EMAIL")
        val token = generateToken()
        val expiresAt = LocalDateTime.now(clock).plusHours(1)
        tokenRepository.insert(user.id, token, "VERIFY_EMAIL", expiresAt)
        emailService.sendVerificationEmail(email, token)
    }

    fun forgotPassword(email: String) {
        val user = userRepository.findByEmail(email) ?: return
        if (!user.emailVerified) return

        tokenRepository.deleteByUserIdAndType(user.id, "RESET_PASSWORD")
        val token = generateToken()
        val expiresAt = LocalDateTime.now(clock).plusHours(1)
        tokenRepository.insert(user.id, token, "RESET_PASSWORD", expiresAt)
        emailService.sendPasswordResetEmail(email, token)
    }

    fun resetPassword(token: String, newPassword: String) {
        require(newPassword.length >= 8) { "Password must be at least 8 characters" }

        val record = tokenRepository.findByToken(token)
            ?: throw IllegalArgumentException("Invalid or expired reset link")

        if (record.tokenType != "RESET_PASSWORD") {
            throw IllegalArgumentException("Invalid or expired reset link")
        }
        if (record.expiresAt.isBefore(LocalDateTime.now(clock))) {
            tokenRepository.deleteByToken(token)
            throw IllegalArgumentException("Reset link has expired")
        }

        val hash = encoder.encode(newPassword)
        userRepository.updatePasswordHash(record.userId, hash)
        tokenRepository.deleteByToken(token)
    }

    fun findById(userId: UUID): AuthResponse? {
        val user = userRepository.findById(userId) ?: return null
        return AuthResponse(userId = user.id, email = user.email)
    }

    private fun generateToken(): String {
        val bytes = ByteArray(32)
        secureRandom.nextBytes(bytes)
        return bytes.joinToString("") { "%02x".format(it) }
    }
}
