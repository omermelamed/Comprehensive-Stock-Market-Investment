package com.investment.config

import com.fasterxml.jackson.databind.ObjectMapper
import com.investment.application.JwtService
import org.springframework.boot.web.servlet.FilterRegistrationBean
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class FilterConfig(
    private val jwtService: JwtService,
    private val objectMapper: ObjectMapper
) {

    @Bean
    fun jwtAuthFilterRegistration(): FilterRegistrationBean<JwtAuthFilter> {
        val filter = FilterRegistrationBean(JwtAuthFilter(jwtService, objectMapper))
        filter.addUrlPatterns("/api/*")
        filter.order = 1
        return filter
    }
}
