package com.investment.config

import com.fasterxml.jackson.databind.ObjectMapper
import com.investment.application.JwtService
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.web.filter.OncePerRequestFilter

class JwtAuthFilter(
    private val jwtService: JwtService,
    private val objectMapper: ObjectMapper
) : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        if (request.requestURI.startsWith("/api/auth/")) {
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
