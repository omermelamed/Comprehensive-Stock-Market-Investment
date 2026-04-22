package com.investment.api

import com.investment.api.dto.*
import com.investment.application.JwtService
import com.investment.application.RequestContext
import com.investment.application.UserService
import jakarta.servlet.http.Cookie
import jakarta.servlet.http.HttpServletResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val userService: UserService,
    private val jwtService: JwtService,
    @Value("\${app.jwt.expiry-days}") private val expiryDays: Long,
    @Value("\${app.cookie.secure:true}") private val cookieSecure: Boolean
) {

    @PostMapping("/register")
    fun register(@RequestBody request: AuthRequest): ResponseEntity<MessageResponse> {
        val message = userService.register(request.email, request.password)
        return ResponseEntity.status(201).body(MessageResponse(message))
    }

    @PostMapping("/login")
    fun login(
        @RequestBody request: AuthRequest,
        response: HttpServletResponse
    ): ResponseEntity<AuthResponse> {
        val authResponse = userService.login(request.email, request.password)
        val token = jwtService.generateToken(authResponse.userId)
        setAuthCookie(response, token)
        return ResponseEntity.ok(authResponse.copy(token = token))
    }

    @PostMapping("/verify-email")
    fun verifyEmail(@RequestBody request: VerifyEmailRequest): ResponseEntity<MessageResponse> {
        userService.verifyEmail(request.token)
        return ResponseEntity.ok(MessageResponse("Email verified"))
    }

    @PostMapping("/resend-verification")
    fun resendVerification(@RequestBody request: ResendVerificationRequest): ResponseEntity<MessageResponse> {
        userService.resendVerification(request.email)
        return ResponseEntity.ok(MessageResponse("If the account exists, a verification email has been sent"))
    }

    @PostMapping("/forgot-password")
    fun forgotPassword(@RequestBody request: ForgotPasswordRequest): ResponseEntity<MessageResponse> {
        userService.forgotPassword(request.email)
        return ResponseEntity.ok(MessageResponse("If an account exists for that email, we sent a reset link"))
    }

    @PostMapping("/reset-password")
    fun resetPassword(@RequestBody request: ResetPasswordRequest): ResponseEntity<MessageResponse> {
        userService.resetPassword(request.token, request.newPassword)
        return ResponseEntity.ok(MessageResponse("Password updated"))
    }

    @PostMapping("/logout")
    fun logout(response: HttpServletResponse): ResponseEntity<Void> {
        clearAuthCookie(response)
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/me")
    fun me(): ResponseEntity<AuthResponse> {
        val userId = RequestContext.get()
        val user = userService.findById(userId)
            ?: return ResponseEntity.status(401).build()
        return ResponseEntity.ok(user)
    }

    private fun setAuthCookie(response: HttpServletResponse, token: String) {
        val cookie = Cookie("auth_token", token)
        cookie.isHttpOnly = true
        cookie.secure = cookieSecure
        cookie.path = "/"
        cookie.maxAge = (expiryDays * 86400).toInt()
        cookie.setAttribute("SameSite", if (cookieSecure) "None" else "Lax")
        response.addCookie(cookie)
    }

    private fun clearAuthCookie(response: HttpServletResponse) {
        val cookie = Cookie("auth_token", "")
        cookie.maxAge = 0
        cookie.path = "/"
        cookie.isHttpOnly = true
        cookie.secure = cookieSecure
        cookie.setAttribute("SameSite", if (cookieSecure) "None" else "Lax")
        response.addCookie(cookie)
    }
}
