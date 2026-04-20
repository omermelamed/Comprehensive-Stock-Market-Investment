package com.investment.api

import com.investment.api.dto.AuthRequest
import com.investment.api.dto.AuthResponse
import com.investment.application.JwtService
import com.investment.application.RequestContext
import com.investment.application.UserService
import jakarta.servlet.http.Cookie
import jakarta.servlet.http.HttpServletResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val userService: UserService,
    private val jwtService: JwtService,
    @Value("\${app.jwt.expiry-days}") private val expiryDays: Long,
    @Value("\${app.cookie.secure:true}") private val cookieSecure: Boolean
) {

    @PostMapping("/register")
    fun register(
        @RequestBody request: AuthRequest,
        response: HttpServletResponse
    ): ResponseEntity<AuthResponse> {
        val authResponse = userService.register(request.username, request.password)
        setAuthCookie(response, authResponse)
        return ResponseEntity.status(201).body(authResponse)
    }

    @PostMapping("/login")
    fun login(
        @RequestBody request: AuthRequest,
        response: HttpServletResponse
    ): ResponseEntity<AuthResponse> {
        val authResponse = userService.login(request.username, request.password)
        setAuthCookie(response, authResponse)
        return ResponseEntity.ok(authResponse)
    }

    @PostMapping("/logout")
    fun logout(response: HttpServletResponse): ResponseEntity<Void> {
        clearAuthCookie(response)
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/me")
    fun me(): ResponseEntity<AuthResponse> {
        val userId = RequestContext.get()
        // Valid JWT but user no longer exists — treat as unauthorized, not 404
        val user = userService.findById(userId)
            ?: return ResponseEntity.status(401).build()
        return ResponseEntity.ok(user)
    }

    private fun setAuthCookie(response: HttpServletResponse, authResponse: AuthResponse) {
        val token = jwtService.generateToken(authResponse.userId)
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
