package com.investment.application

import jakarta.mail.internet.MimeMessage
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.mail.javamail.MimeMessageHelper
import org.springframework.stereotype.Service

@Service
class EmailService(
    @Autowired(required = false) private val mailSender: JavaMailSender?,
    @Value("\${app.mail.from-address:noreply@example.com}") private val fromAddress: String,
    @Value("\${app.mail.from-name:Alloca}") private val fromName: String,
    @Value("\${app.frontend-url:http://localhost:3000}") private val frontendUrl: String,
    @Value("\${spring.mail.host:}") private val mailHost: String
) {

    private val log = LoggerFactory.getLogger(EmailService::class.java)

    private val mailEnabled get() = mailHost.isNotBlank()

    fun sendVerificationEmail(toEmail: String, token: String) {
        val link = "$frontendUrl/verify-email?token=$token"
        val subject = "Verify your email — $fromName"
        val html = buildEmailHtml(
            heading = "Verify your email",
            body = "Click the button below to verify your email address and activate your account.",
            buttonText = "Verify Email",
            buttonUrl = link
        )
        send(toEmail, subject, html, link, "verification")
    }

    fun sendPasswordResetEmail(toEmail: String, token: String) {
        val link = "$frontendUrl/reset-password?token=$token"
        val subject = "Reset your password — $fromName"
        val html = buildEmailHtml(
            heading = "Reset your password",
            body = "Click the button below to set a new password for your account.",
            buttonText = "Reset Password",
            buttonUrl = link
        )
        send(toEmail, subject, html, link, "password reset")
    }

    private fun send(toEmail: String, subject: String, html: String, link: String, type: String) {
        if (!mailEnabled || mailSender == null) {
            log.info("=== EMAIL ($type) ===")
            log.info("To: $toEmail")
            log.info("Link: $link")
            log.info("=== END EMAIL ===")
            return
        }

        val message: MimeMessage = mailSender.createMimeMessage()
        val helper = MimeMessageHelper(message, true, "UTF-8")
        helper.setTo(toEmail)
        helper.setSubject(subject)
        helper.setFrom(fromAddress, fromName)
        helper.setText(html, true)
        mailSender.send(message)
        log.info("Sent $type email to $toEmail")
    }

    private fun buildEmailHtml(heading: String, body: String, buttonText: String, buttonUrl: String): String {
        return """
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
            <tr><td align="center">
              <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                <tr><td style="text-align:center;padding-bottom:24px;">
                  <span style="font-size:20px;font-weight:700;color:#18181b;">$fromName</span>
                </td></tr>
                <tr><td style="text-align:center;padding-bottom:16px;">
                  <h1 style="margin:0;font-size:24px;font-weight:600;color:#18181b;">$heading</h1>
                </td></tr>
                <tr><td style="text-align:center;padding-bottom:32px;">
                  <p style="margin:0;font-size:15px;line-height:1.6;color:#52525b;">$body</p>
                </td></tr>
                <tr><td style="text-align:center;padding-bottom:32px;">
                  <a href="$buttonUrl" style="display:inline-block;padding:12px 32px;background-color:#18181b;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">$buttonText</a>
                </td></tr>
                <tr><td style="text-align:center;border-top:1px solid #e4e4e7;padding-top:24px;">
                  <p style="margin:0;font-size:13px;color:#a1a1aa;">This link expires in 1 hour.</p>
                  <p style="margin:8px 0 0;font-size:13px;color:#a1a1aa;">If you didn't request this, you can safely ignore this email.</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """.trimIndent()
    }
}
