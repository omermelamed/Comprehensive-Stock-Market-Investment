package com.investment.config

import com.fasterxml.jackson.databind.ObjectMapper
import com.investment.application.JwtService
import com.investment.application.RequestContext
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.web.filter.OncePerRequestFilter

class JwtAuthFilter(
    private val jwtService: JwtService,
    private val objectMapper: ObjectMapper
) : OncePerRequestFilter() {

    // Paths that do not require a valid JWT — everything else is protected,
    // including GET /api/auth/me which needs RequestContext to be populated.
    private val publicPaths = setOf(
        "/api/auth/register",
        "/api/auth/login",
        "/api/auth/logout",
        "/api/auth/verify-email",
        "/api/auth/resend-verification",
        "/api/auth/forgot-password",
        "/api/auth/reset-password"
    )

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        if (request.method == "OPTIONS") {
            filterChain.doFilter(request, response)
            return
        }

        if (request.requestURI in publicPaths) {
            filterChain.doFilter(request, response)
            return
        }

        val token = request.cookies
            ?.firstOrNull { it.name == "auth_token" }
            ?.value

        val userId = token?.let { jwtService.validateToken(it) }

        if (userId == null) {
            response.status = 401
            response.contentType = "application/json"
            response.characterEncoding = "UTF-8"
            response.writer.write(objectMapper.writeValueAsString(mapOf("error" to "Unauthorized")))
            return
        }

        try {
            RequestContext.set(userId)
            filterChain.doFilter(request, response)
        } finally {
            RequestContext.clear()
        }
    }
}
