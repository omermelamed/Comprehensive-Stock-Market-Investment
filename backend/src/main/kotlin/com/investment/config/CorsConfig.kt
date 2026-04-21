package com.investment.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.web.servlet.FilterRegistrationBean
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.UrlBasedCorsConfigurationSource
import org.springframework.web.filter.CorsFilter

@Configuration
class CorsConfig(
    @Value("\${app.cors.allowed-origin}") private val allowedOrigin: String
) {

    @Bean
    fun corsFilterRegistration(): FilterRegistrationBean<CorsFilter> {
        val config = CorsConfiguration()
        allowedOrigin.split(",").map { it.trim() }.forEach { config.addAllowedOrigin(it) }
        config.allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "OPTIONS")
        config.addAllowedHeader("*")
        config.allowCredentials = true

        val source = UrlBasedCorsConfigurationSource()
        source.registerCorsConfiguration("/**", config)

        val registration = FilterRegistrationBean(CorsFilter(source))
        registration.order = 0
        return registration
    }
}
