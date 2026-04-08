package com.investment.infrastructure

import com.investment.api.dto.AllocationEntry
import com.twilio.Twilio
import com.twilio.rest.api.v2010.account.Message
import com.twilio.type.PhoneNumber
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.math.BigDecimal
import jakarta.annotation.PostConstruct

@Service
class WhatsAppNotificationService(
    @Value("\${app.twilio.account-sid:}") private val accountSid: String,
    @Value("\${app.twilio.auth-token:}") private val authToken: String,
    @Value("\${app.twilio.from-number:whatsapp:+14155238886}") private val fromNumber: String
) {

    private val log = LoggerFactory.getLogger(javaClass)

    private val twilioReady: Boolean get() = accountSid.isNotBlank() && authToken.isNotBlank()

    @PostConstruct
    fun init() {
        if (twilioReady) {
            Twilio.init(accountSid, authToken)
            log.info("WhatsApp notifications enabled (Twilio initialized)")
        } else {
            log.info("WhatsApp notifications disabled (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not set)")
        }
    }

    /**
     * Sends an investment summary to [toWhatsAppNumber].
     * The number must be in E.164 format, e.g. "+972501234567".
     * The "whatsapp:" prefix is added automatically.
     * If Twilio is not configured or [toWhatsAppNumber] is blank, the call is a no-op.
     */
    fun sendInvestmentSummary(
        toWhatsAppNumber: String?,
        totalInvested: BigDecimal,
        currency: String,
        allocations: List<AllocationEntry>
    ) {
        if (!twilioReady || toWhatsAppNumber.isNullOrBlank()) return

        val toNumber = if (toWhatsAppNumber.startsWith("whatsapp:")) toWhatsAppNumber
                       else "whatsapp:$toWhatsAppNumber"

        val lines = allocations
            .filter { it.amount > BigDecimal.ZERO }
            .sortedByDescending { it.amount }
            .joinToString("\n") { "  • ${it.symbol}: $currency ${it.amount.setScale(2)}" }

        val body = """
            |📊 *Monthly Investment Confirmed*
            |
            |Total invested: *$currency ${totalInvested.setScale(2)}*
            |
            |Breakdown:
            |$lines
        """.trimMargin()

        try {
            Message.creator(
                PhoneNumber(toNumber),
                PhoneNumber(fromNumber),
                body
            ).create()
            log.info("WhatsApp investment summary sent to {}", toNumber)
        } catch (e: Exception) {
            // Non-critical — log and continue; the investment is already recorded
            log.warn("WhatsApp notification failed: {}", e.message)
        }
    }
}
