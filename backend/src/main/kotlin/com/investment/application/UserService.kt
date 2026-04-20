package com.investment.application

import com.investment.api.dto.AuthResponse
import com.investment.domain.ConflictException
import com.investment.domain.UnauthorizedException
import com.investment.infrastructure.UserRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class UserService(
    private val userRepository: UserRepository,
    @Value("\${app.registration.enabled:true}") private val registrationEnabled: Boolean
) {

    private val encoder = BCryptPasswordEncoder()

    fun register(username: String, password: String): AuthResponse {
        if (!registrationEnabled) {
            throw UnauthorizedException("Public registration is disabled")
        }
        require(username.length in 3..50) { "Username must be 3–50 characters" }
        require(password.length >= 8) { "Password must be at least 8 characters" }
        if (userRepository.findByUsername(username) != null) {
            throw ConflictException("Username already taken")
        }
        val hash = encoder.encode(password)
        val userId = userRepository.insert(username, hash)
        return AuthResponse(userId = userId, username = username)
    }

    fun login(username: String, password: String): AuthResponse {
        val user = userRepository.findByUsername(username)
            ?: throw UnauthorizedException("Invalid username or password")
        if (!encoder.matches(password, user.passwordHash)) {
            throw UnauthorizedException("Invalid username or password")
        }
        return AuthResponse(userId = user.id, username = user.username)
    }

    fun findById(userId: UUID): AuthResponse? {
        val user = userRepository.findById(userId) ?: return null
        return AuthResponse(userId = user.id, username = user.username)
    }
}
