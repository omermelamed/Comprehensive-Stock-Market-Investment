package com.investment.api

import com.investment.application.UserProfileService
import com.investment.application.WhatsAppBotService
import com.investment.infrastructure.WhatsAppNotificationService
import com.twilio.security.RequestValidator
import jakarta.servlet.http.HttpServletRequest
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/whatsapp")
class WhatsAppWebhookController(
    private val botService: WhatsAppBotService,
    private val notificationService: WhatsAppNotificationService,
    private val userProfileService: UserProfileService,
    @Value("\${app.twilio.auth-token:}") private val authToken: String
) {

    private val log = LoggerFactory.getLogger(javaClass)

    /**
     * Twilio inbound webhook. Twilio sends form-encoded POST requests for every
     * inbound WhatsApp message. Returns empty TwiML so Twilio does not send an
     * additional automatic reply.
     */
    @PostMapping(
        "/inbound",
        consumes = [MediaType.APPLICATION_FORM_URLENCODED_VALUE],
        produces = [MediaType.APPLICATION_XML_VALUE]
    )
    fun inbound(
        @RequestParam("From")       from: String,
        @RequestParam("Body")       body: String,
        @RequestParam("MessageSid", required = false) messageSid: String?,
        request: HttpServletRequest
    ): ResponseEntity<String> {

        if (!validateTwilioSignature(request)) {
            log.warn("Rejected inbound request from {} — invalid Twilio signature", from)
            return ResponseEntity.status(403).body("<Response/>")
        }

        val sid = messageSid ?: "unknown"
        botService.handleInbound(from = from, body = body.trim(), twilioSid = sid)

        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_XML)
            .body("<Response/>")
    }

    /**
     * Sends a test WhatsApp message to the configured number.
     * Useful for verifying the Twilio setup from the profile page.
     */
    @PostMapping("/test")
    fun sendTestMessage(): ResponseEntity<Map<String, String>> {
        val profile = userProfileService.getProfile()
        val number = profile?.whatsappNumber
        if (number.isNullOrBlank()) {
            return ResponseEntity.badRequest().body(mapOf("error" to "No WhatsApp number configured in your profile."))
        }
        notificationService.sendMessage(number, "Hello from your Portfolio app! Your WhatsApp bot is working.")
        return ResponseEntity.ok(mapOf("status" to "sent", "to" to number))
    }

    /**
     * Validates the Twilio request signature.
     * If authToken is blank (dev mode), signature validation is skipped.
     */
    private fun validateTwilioSignature(request: HttpServletRequest): Boolean {
        if (authToken.isBlank()) return true

        val signature = request.getHeader("X-Twilio-Signature") ?: return false
        val url = buildRequestUrl(request)

        val params = request.parameterMap.mapValues { (_, values) -> values.firstOrNull() ?: "" }
        val validator = RequestValidator(authToken)
        return validator.validate(url, params, signature)
    }

    private fun buildRequestUrl(request: HttpServletRequest): String {
        val scheme = request.getHeader("X-Forwarded-Proto") ?: request.scheme
        val host   = request.getHeader("X-Forwarded-Host") ?: request.serverName
        val port   = if (request.serverPort == 80 || request.serverPort == 443) "" else ":${request.serverPort}"
        return "$scheme://$host$port${request.requestURI}"
    }
}
