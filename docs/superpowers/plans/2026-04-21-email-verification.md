# Email Verification & Password Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add email verification on signup and password reset, replacing username-based auth with email-based auth.

**Architecture:** Database-backed verification tokens with 1-hour expiry. Registration creates an unverified user and sends a verification email. Login rejects unverified accounts. Password reset reuses the same token table. Email is sent via Spring Mail (or logged to console when SMTP is not configured).

**Tech Stack:** Kotlin, Spring Boot, jOOQ (raw SQL), Flyway, Spring Mail, React, TypeScript, Tailwind CSS

---

## File Structure

### Backend — New Files
| File | Responsibility |
|------|---------------|
| `backend/src/main/resources/db/migration/V16__email_verification.sql` | Wipe data, rename username→email, add email_verified, create verification_tokens table |
| `backend/src/main/kotlin/com/investment/infrastructure/VerificationTokenRepository.kt` | CRUD for verification_tokens table |
| `backend/src/main/kotlin/com/investment/application/EmailService.kt` | Send verification/reset emails via Spring Mail (or log to console) |
| `backend/src/main/kotlin/com/investment/config/TokenCleanupScheduler.kt` | Daily cleanup of expired tokens |
| `backend/src/main/kotlin/com/investment/api/dto/VerifyEmailRequest.kt` | DTO for verify-email endpoint |
| `backend/src/main/kotlin/com/investment/api/dto/ResendVerificationRequest.kt` | DTO for resend-verification endpoint |
| `backend/src/main/kotlin/com/investment/api/dto/ForgotPasswordRequest.kt` | DTO for forgot-password endpoint |
| `backend/src/main/kotlin/com/investment/api/dto/ResetPasswordRequest.kt` | DTO for reset-password endpoint |
| `backend/src/main/kotlin/com/investment/api/dto/MessageResponse.kt` | Generic `{ message }` response DTO |
| `backend/src/main/kotlin/com/investment/domain/EmailNotVerifiedException.kt` | 403 exception for unverified login attempts |
| `backend/src/main/kotlin/com/investment/domain/RateLimitException.kt` | 429 exception for resend rate limiting |
| `backend/src/test/kotlin/com/investment/application/EmailServiceTest.kt` | Tests for EmailService |

### Backend — Modified Files
| File | Change |
|------|--------|
| `backend/src/main/kotlin/com/investment/infrastructure/UserRepository.kt` | `username`→`email`, add `emailVerified` to `UserRecord`, `findByEmail`, `setEmailVerified`, `updatePasswordHash` |
| `backend/src/main/kotlin/com/investment/application/UserService.kt` | New register flow (no cookie), verify, resend, forgot/reset password |
| `backend/src/main/kotlin/com/investment/api/AuthController.kt` | New endpoints, email instead of username, no cookie on register |
| `backend/src/main/kotlin/com/investment/api/dto/AuthRequest.kt` | `username`→`email` |
| `backend/src/main/kotlin/com/investment/api/dto/AuthResponse.kt` | `username`→`email` |
| `backend/src/main/kotlin/com/investment/config/JwtAuthFilter.kt` | Add 4 new public paths |
| `backend/src/main/kotlin/com/investment/api/GlobalExceptionHandler.kt` | Handle `EmailNotVerifiedException` (403) and `RateLimitException` (429) |
| `backend/src/main/resources/application.yml` | Add spring.mail and app.mail/frontend-url config |
| `backend/src/test/kotlin/com/investment/application/UserServiceTest.kt` | Rewrite for email-based flow + verification + reset |

### Frontend — New Files
| File | Responsibility |
|------|---------------|
| `frontend/src/features/auth/VerifyEmailPage.tsx` | Token verification on mount |
| `frontend/src/features/auth/ForgotPasswordPage.tsx` | Email input → forgot-password API |
| `frontend/src/features/auth/ResetPasswordPage.tsx` | New password form → reset-password API |

### Frontend — Modified Files
| File | Change |
|------|--------|
| `frontend/src/api/auth.ts` | `username`→`email`, add verifyEmail/resendVerification/forgotPassword/resetPassword |
| `frontend/src/features/auth/RegisterPage.tsx` | Email field + "check your email" confirmation state |
| `frontend/src/features/auth/LoginPage.tsx` | Email field + forgot password link + resend on 403 |
| `frontend/src/features/auth/AuthContext.tsx` | `username`→`email` in AuthUser type reference |
| `frontend/src/App.tsx` | Add 3 new public routes |

---

## Task 1: Database Migration

**Files:**
- Create: `backend/src/main/resources/db/migration/V16__email_verification.sql`

- [ ] **Step 1: Write the migration**

Create `backend/src/main/resources/db/migration/V16__email_verification.sql`:

```sql
-- V16: Email verification and password reset
-- Wipes all users (agreed: early production, clean slate)
-- Renames username → email, adds email_verified, creates verification_tokens

-- 1. Wipe all existing data
TRUNCATE TABLE
    telegram_pending_confirmations,
    telegram_scheduled_message_log,
    telegram_scheduled_messages,
    telegram_conversations,
    risk_score_history,
    ai_recommendation_cache,
    monthly_investment_sessions,
    options_transactions,
    alerts,
    watchlist,
    portfolio_snapshots,
    transactions,
    target_allocations,
    user_profile,
    users
CASCADE;

-- 2. Alter users table: username → email, add email_verified
ALTER TABLE users RENAME COLUMN username TO email;
ALTER TABLE users ALTER COLUMN email TYPE VARCHAR(255);
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Create verification_tokens table
CREATE TABLE verification_tokens (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      VARCHAR(64)  NOT NULL UNIQUE,
    token_type VARCHAR(20)  NOT NULL CHECK (token_type IN ('VERIFY_EMAIL', 'RESET_PASSWORD')),
    expires_at TIMESTAMP    NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_verification_tokens_token ON verification_tokens (token);
CREATE INDEX idx_verification_tokens_expires ON verification_tokens (expires_at);
CREATE INDEX idx_verification_tokens_user_type ON verification_tokens (user_id, token_type);
```

- [ ] **Step 2: Verify migration compiles**

Run: `cd backend && ./gradlew classes`
Expected: BUILD SUCCESSFUL (migration is just SQL, but ensures no syntax issue blocks Flyway)

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/resources/db/migration/V16__email_verification.sql
git commit -m "feat: add V16 migration for email verification and password reset"
```

---

## Task 2: Domain Exceptions

**Files:**
- Create: `backend/src/main/kotlin/com/investment/domain/EmailNotVerifiedException.kt`
- Create: `backend/src/main/kotlin/com/investment/domain/RateLimitException.kt`
- Modify: `backend/src/main/kotlin/com/investment/api/GlobalExceptionHandler.kt`

- [ ] **Step 1: Create EmailNotVerifiedException**

Create `backend/src/main/kotlin/com/investment/domain/EmailNotVerifiedException.kt`:

```kotlin
package com.investment.domain

class EmailNotVerifiedException(
    message: String = "Email not verified"
) : RuntimeException(message)
```

- [ ] **Step 2: Create RateLimitException**

Create `backend/src/main/kotlin/com/investment/domain/RateLimitException.kt`:

```kotlin
package com.investment.domain

class RateLimitException(
    message: String = "Too many requests"
) : RuntimeException(message)
```

- [ ] **Step 3: Add handlers to GlobalExceptionHandler**

In `backend/src/main/kotlin/com/investment/api/GlobalExceptionHandler.kt`, add these two imports and handler methods:

Add import:
```kotlin
import com.investment.domain.EmailNotVerifiedException
import com.investment.domain.RateLimitException
```

Add handler methods (before the `handleGeneric` catch-all):

```kotlin
@ExceptionHandler(EmailNotVerifiedException::class)
fun handleEmailNotVerified(ex: EmailNotVerifiedException): ResponseEntity<Map<String, String?>> {
    return ResponseEntity.status(403).body(mapOf("error" to ex.message, "code" to "EMAIL_NOT_VERIFIED"))
}

@ExceptionHandler(RateLimitException::class)
fun handleRateLimit(ex: RateLimitException): ResponseEntity<Map<String, String?>> {
    return ResponseEntity.status(429).body(mapOf("error" to ex.message))
}
```

- [ ] **Step 4: Verify it compiles**

Run: `cd backend && ./gradlew classes`
Expected: BUILD SUCCESSFUL

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/kotlin/com/investment/domain/EmailNotVerifiedException.kt \
       backend/src/main/kotlin/com/investment/domain/RateLimitException.kt \
       backend/src/main/kotlin/com/investment/api/GlobalExceptionHandler.kt
git commit -m "feat: add EmailNotVerifiedException (403) and RateLimitException (429)"
```

---

## Task 3: DTOs

**Files:**
- Modify: `backend/src/main/kotlin/com/investment/api/dto/AuthRequest.kt`
- Modify: `backend/src/main/kotlin/com/investment/api/dto/AuthResponse.kt`
- Create: `backend/src/main/kotlin/com/investment/api/dto/VerifyEmailRequest.kt`
- Create: `backend/src/main/kotlin/com/investment/api/dto/ResendVerificationRequest.kt`
- Create: `backend/src/main/kotlin/com/investment/api/dto/ForgotPasswordRequest.kt`
- Create: `backend/src/main/kotlin/com/investment/api/dto/ResetPasswordRequest.kt`
- Create: `backend/src/main/kotlin/com/investment/api/dto/MessageResponse.kt`

- [ ] **Step 1: Update AuthRequest — rename username to email**

Replace the full content of `backend/src/main/kotlin/com/investment/api/dto/AuthRequest.kt`:

```kotlin
package com.investment.api.dto

data class AuthRequest(
    val email: String,
    val password: String
)
```

- [ ] **Step 2: Update AuthResponse — rename username to email**

Replace the full content of `backend/src/main/kotlin/com/investment/api/dto/AuthResponse.kt`:

```kotlin
package com.investment.api.dto

import java.util.UUID

data class AuthResponse(
    val userId: UUID,
    val email: String
)
```

- [ ] **Step 3: Create new DTOs**

Create `backend/src/main/kotlin/com/investment/api/dto/VerifyEmailRequest.kt`:

```kotlin
package com.investment.api.dto

data class VerifyEmailRequest(val token: String)
```

Create `backend/src/main/kotlin/com/investment/api/dto/ResendVerificationRequest.kt`:

```kotlin
package com.investment.api.dto

data class ResendVerificationRequest(val email: String)
```

Create `backend/src/main/kotlin/com/investment/api/dto/ForgotPasswordRequest.kt`:

```kotlin
package com.investment.api.dto

data class ForgotPasswordRequest(val email: String)
```

Create `backend/src/main/kotlin/com/investment/api/dto/ResetPasswordRequest.kt`:

```kotlin
package com.investment.api.dto

data class ResetPasswordRequest(
    val token: String,
    val newPassword: String
)
```

Create `backend/src/main/kotlin/com/investment/api/dto/MessageResponse.kt`:

```kotlin
package com.investment.api.dto

data class MessageResponse(val message: String)
```

- [ ] **Step 4: Verify it compiles**

Run: `cd backend && ./gradlew classes`
Expected: BUILD SUCCESSFUL

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/kotlin/com/investment/api/dto/
git commit -m "feat: update DTOs for email-based auth and add verification/reset request types"
```

---

## Task 4: UserRepository — email-based queries

**Files:**
- Modify: `backend/src/main/kotlin/com/investment/infrastructure/UserRepository.kt`

- [ ] **Step 1: Rewrite UserRepository**

Replace the full content of `backend/src/main/kotlin/com/investment/infrastructure/UserRepository.kt`:

```kotlin
package com.investment.infrastructure

import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.util.UUID

data class UserRecord(
    val id: UUID,
    val email: String,
    val passwordHash: String,
    val emailVerified: Boolean
)

@Repository
class UserRepository(private val dsl: DSLContext) {

    fun findByEmail(email: String): UserRecord? {
        return dsl.fetchOne(
            "SELECT id, email, password_hash, email_verified FROM users WHERE LOWER(email) = LOWER(?)",
            email
        )?.let { r ->
            UserRecord(
                id = r.get("id", UUID::class.java),
                email = r.get("email", String::class.java),
                passwordHash = r.get("password_hash", String::class.java),
                emailVerified = r.get("email_verified", Boolean::class.java)
            )
        }
    }

    fun insert(email: String, passwordHash: String): UUID {
        val id = UUID.randomUUID()
        dsl.execute(
            "INSERT INTO users (id, email, password_hash, email_verified) VALUES (?::uuid, ?, ?, FALSE)",
            id.toString(), email, passwordHash
        )
        return id
    }

    fun setEmailVerified(userId: UUID) {
        dsl.execute(
            "UPDATE users SET email_verified = TRUE WHERE id = ?::uuid",
            userId.toString()
        )
    }

    fun updatePasswordHash(userId: UUID, passwordHash: String) {
        dsl.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?::uuid",
            passwordHash, userId.toString()
        )
    }

    fun findAllIds(): List<UUID> {
        return dsl.fetch("SELECT id FROM users")
            .map { it.get("id", UUID::class.java) }
    }

    fun findById(id: UUID): UserRecord? {
        return dsl.fetchOne(
            "SELECT id, email, password_hash, email_verified FROM users WHERE id = ?::uuid",
            id.toString()
        )?.let { r ->
            UserRecord(
                id = r.get("id", UUID::class.java),
                email = r.get("email", String::class.java),
                passwordHash = r.get("password_hash", String::class.java),
                emailVerified = r.get("email_verified", Boolean::class.java)
            )
        }
    }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && ./gradlew classes`
Expected: Compilation errors in UserService (references `findByUsername` and `username`) — this is expected and will be fixed in Task 6.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/kotlin/com/investment/infrastructure/UserRepository.kt
git commit -m "feat: rewrite UserRepository for email-based auth with email_verified field"
```

---

## Task 5: VerificationTokenRepository

**Files:**
- Create: `backend/src/main/kotlin/com/investment/infrastructure/VerificationTokenRepository.kt`

- [ ] **Step 1: Create VerificationTokenRepository**

Create `backend/src/main/kotlin/com/investment/infrastructure/VerificationTokenRepository.kt`:

```kotlin
package com.investment.infrastructure

import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.time.LocalDateTime
import java.util.UUID

data class VerificationTokenRecord(
    val id: UUID,
    val userId: UUID,
    val token: String,
    val tokenType: String,
    val expiresAt: LocalDateTime,
    val createdAt: LocalDateTime
)

@Repository
class VerificationTokenRepository(private val dsl: DSLContext) {

    fun insert(userId: UUID, token: String, tokenType: String, expiresAt: LocalDateTime): UUID {
        val id = UUID.randomUUID()
        dsl.execute(
            """INSERT INTO verification_tokens (id, user_id, token, token_type, expires_at)
               VALUES (?::uuid, ?::uuid, ?, ?, ?)""",
            id.toString(), userId.toString(), token, tokenType, expiresAt
        )
        return id
    }

    fun findByToken(token: String): VerificationTokenRecord? {
        return dsl.fetchOne(
            """SELECT id, user_id, token, token_type, expires_at, created_at
               FROM verification_tokens WHERE token = ?""",
            token
        )?.let { r ->
            VerificationTokenRecord(
                id = r.get("id", UUID::class.java),
                userId = r.get("user_id", UUID::class.java),
                token = r.get("token", String::class.java),
                tokenType = r.get("token_type", String::class.java),
                expiresAt = r.get("expires_at", LocalDateTime::class.java),
                createdAt = r.get("created_at", LocalDateTime::class.java)
            )
        }
    }

    fun deleteByToken(token: String) {
        dsl.execute("DELETE FROM verification_tokens WHERE token = ?", token)
    }

    fun deleteByUserIdAndType(userId: UUID, tokenType: String) {
        dsl.execute(
            "DELETE FROM verification_tokens WHERE user_id = ?::uuid AND token_type = ?",
            userId.toString(), tokenType
        )
    }

    fun findLatestByUserIdAndType(userId: UUID, tokenType: String): VerificationTokenRecord? {
        return dsl.fetchOne(
            """SELECT id, user_id, token, token_type, expires_at, created_at
               FROM verification_tokens
               WHERE user_id = ?::uuid AND token_type = ?
               ORDER BY created_at DESC LIMIT 1""",
            userId.toString(), tokenType
        )?.let { r ->
            VerificationTokenRecord(
                id = r.get("id", UUID::class.java),
                userId = r.get("user_id", UUID::class.java),
                token = r.get("token", String::class.java),
                tokenType = r.get("token_type", String::class.java),
                expiresAt = r.get("expires_at", LocalDateTime::class.java),
                createdAt = r.get("created_at", LocalDateTime::class.java)
            )
        }
    }

    fun deleteExpired() {
        dsl.execute("DELETE FROM verification_tokens WHERE expires_at < NOW()")
    }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && ./gradlew classes`
Expected: BUILD SUCCESSFUL (or expected failures in UserService, not in this file)

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/kotlin/com/investment/infrastructure/VerificationTokenRepository.kt
git commit -m "feat: add VerificationTokenRepository for email verification and password reset tokens"
```

---

## Task 6: EmailService

**Files:**
- Modify: `backend/src/main/resources/application.yml`
- Create: `backend/src/main/kotlin/com/investment/application/EmailService.kt`

- [ ] **Step 1: Add mail configuration to application.yml**

In `backend/src/main/resources/application.yml`, add a `mail:` block under the existing `spring:` key (after `jooq:`) and add `mail:` and `frontend-url:` under the existing `app:` key.

Add under `spring:` (after the `jooq:` block):

```yaml
  mail:
    host: ${SPRING_MAIL_HOST:}
    port: ${SPRING_MAIL_PORT:587}
    username: ${SPRING_MAIL_USERNAME:}
    password: ${SPRING_MAIL_PASSWORD:}
    properties:
      mail:
        smtp:
          auth: true
          starttls:
            enable: true
```

Add under `app:` (after the `registration:` block):

```yaml
  mail:
    from-address: ${MAIL_FROM_ADDRESS:noreply@example.com}
    from-name: ${MAIL_FROM_NAME:Alloca}
  frontend-url: ${FRONTEND_URL:http://localhost:3000}
```

- [ ] **Step 2: Create EmailService**

Create `backend/src/main/kotlin/com/investment/application/EmailService.kt`:

```kotlin
package com.investment.application

import jakarta.mail.internet.MimeMessage
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.mail.javamail.MimeMessageHelper
import org.springframework.stereotype.Service

@Service
class EmailService(
    private val mailSender: JavaMailSender?,
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
```

- [ ] **Step 3: Verify it compiles**

Run: `cd backend && ./gradlew classes`
Expected: BUILD SUCCESSFUL (or expected failures in UserService only)

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/resources/application.yml \
       backend/src/main/kotlin/com/investment/application/EmailService.kt
git commit -m "feat: add EmailService with SMTP sending and console fallback for dev"
```

---

## Task 7: UserService — email-based auth with verification and reset

**Files:**
- Modify: `backend/src/main/kotlin/com/investment/application/UserService.kt`

- [ ] **Step 1: Rewrite UserService**

Replace the full content of `backend/src/main/kotlin/com/investment/application/UserService.kt`:

```kotlin
package com.investment.application

import com.investment.api.dto.AuthResponse
import com.investment.domain.ConflictException
import com.investment.domain.EmailNotVerifiedException
import com.investment.domain.RateLimitException
import com.investment.domain.UnauthorizedException
import com.investment.infrastructure.UserRepository
import com.investment.infrastructure.VerificationTokenRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.stereotype.Service
import java.security.SecureRandom
import java.time.Clock
import java.time.LocalDateTime
import java.util.UUID

@Service
class UserService(
    private val userRepository: UserRepository,
    private val tokenRepository: VerificationTokenRepository,
    private val emailService: EmailService,
    private val clock: Clock,
    @Value("\${app.registration.enabled:true}") private val registrationEnabled: Boolean
) {

    private val encoder = BCryptPasswordEncoder()
    private val secureRandom = SecureRandom()

    fun register(email: String, password: String): String {
        if (!registrationEnabled) {
            throw UnauthorizedException("Public registration is disabled")
        }
        require(email.matches(Regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$"))) { "Invalid email format" }
        require(password.length >= 8) { "Password must be at least 8 characters" }

        if (userRepository.findByEmail(email) != null) {
            throw ConflictException("Email already registered")
        }

        val hash = encoder.encode(password)
        val userId = userRepository.insert(email, hash)

        val token = generateToken()
        val expiresAt = LocalDateTime.now(clock).plusHours(1)
        tokenRepository.insert(userId, token, "VERIFY_EMAIL", expiresAt)
        emailService.sendVerificationEmail(email, token)

        return "Check your email to verify your account"
    }

    fun verifyEmail(token: String) {
        val record = tokenRepository.findByToken(token)
            ?: throw IllegalArgumentException("Invalid or expired verification link")

        if (record.tokenType != "VERIFY_EMAIL") {
            throw IllegalArgumentException("Invalid or expired verification link")
        }
        if (record.expiresAt.isBefore(LocalDateTime.now(clock))) {
            tokenRepository.deleteByToken(token)
            throw IllegalArgumentException("Verification link has expired")
        }

        userRepository.setEmailVerified(record.userId)
        tokenRepository.deleteByToken(token)
    }

    fun login(email: String, password: String): AuthResponse {
        val user = userRepository.findByEmail(email)
            ?: throw UnauthorizedException("Invalid email or password")
        if (!encoder.matches(password, user.passwordHash)) {
            throw UnauthorizedException("Invalid email or password")
        }
        if (!user.emailVerified) {
            throw EmailNotVerifiedException("Please verify your email before signing in")
        }
        return AuthResponse(userId = user.id, email = user.email)
    }

    fun resendVerification(email: String) {
        val user = userRepository.findByEmail(email) ?: return
        if (user.emailVerified) return

        val latest = tokenRepository.findLatestByUserIdAndType(user.id, "VERIFY_EMAIL")
        if (latest != null && latest.createdAt.isAfter(LocalDateTime.now(clock).minusMinutes(2))) {
            throw RateLimitException("Please wait before requesting another verification email")
        }

        tokenRepository.deleteByUserIdAndType(user.id, "VERIFY_EMAIL")
        val token = generateToken()
        val expiresAt = LocalDateTime.now(clock).plusHours(1)
        tokenRepository.insert(user.id, token, "VERIFY_EMAIL", expiresAt)
        emailService.sendVerificationEmail(email, token)
    }

    fun forgotPassword(email: String) {
        val user = userRepository.findByEmail(email) ?: return
        if (!user.emailVerified) return

        tokenRepository.deleteByUserIdAndType(user.id, "RESET_PASSWORD")
        val token = generateToken()
        val expiresAt = LocalDateTime.now(clock).plusHours(1)
        tokenRepository.insert(user.id, token, "RESET_PASSWORD", expiresAt)
        emailService.sendPasswordResetEmail(email, token)
    }

    fun resetPassword(token: String, newPassword: String) {
        require(newPassword.length >= 8) { "Password must be at least 8 characters" }

        val record = tokenRepository.findByToken(token)
            ?: throw IllegalArgumentException("Invalid or expired reset link")

        if (record.tokenType != "RESET_PASSWORD") {
            throw IllegalArgumentException("Invalid or expired reset link")
        }
        if (record.expiresAt.isBefore(LocalDateTime.now(clock))) {
            tokenRepository.deleteByToken(token)
            throw IllegalArgumentException("Reset link has expired")
        }

        val hash = encoder.encode(newPassword)
        userRepository.updatePasswordHash(record.userId, hash)
        tokenRepository.deleteByToken(token)
    }

    fun findById(userId: UUID): AuthResponse? {
        val user = userRepository.findById(userId) ?: return null
        return AuthResponse(userId = user.id, email = user.email)
    }

    private fun generateToken(): String {
        val bytes = ByteArray(32)
        secureRandom.nextBytes(bytes)
        return bytes.joinToString("") { "%02x".format(it) }
    }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && ./gradlew classes`
Expected: BUILD SUCCESSFUL

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/kotlin/com/investment/application/UserService.kt
git commit -m "feat: rewrite UserService for email verification and password reset flow"
```

---

## Task 8: AuthController — new endpoints

**Files:**
- Modify: `backend/src/main/kotlin/com/investment/api/AuthController.kt`
- Modify: `backend/src/main/kotlin/com/investment/config/JwtAuthFilter.kt`

- [ ] **Step 1: Rewrite AuthController**

Replace the full content of `backend/src/main/kotlin/com/investment/api/AuthController.kt`:

```kotlin
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
        setAuthCookie(response, authResponse)
        return ResponseEntity.ok(authResponse)
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
```

- [ ] **Step 2: Update JwtAuthFilter public paths**

In `backend/src/main/kotlin/com/investment/config/JwtAuthFilter.kt`, replace the `publicPaths` set:

Old:
```kotlin
private val publicPaths = setOf(
    "/api/auth/register",
    "/api/auth/login",
    "/api/auth/logout"
)
```

New:
```kotlin
private val publicPaths = setOf(
    "/api/auth/register",
    "/api/auth/login",
    "/api/auth/logout",
    "/api/auth/verify-email",
    "/api/auth/resend-verification",
    "/api/auth/forgot-password",
    "/api/auth/reset-password"
)
```

- [ ] **Step 3: Verify it compiles**

Run: `cd backend && ./gradlew classes`
Expected: BUILD SUCCESSFUL

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/kotlin/com/investment/api/AuthController.kt \
       backend/src/main/kotlin/com/investment/config/JwtAuthFilter.kt
git commit -m "feat: add auth endpoints for email verification, resend, forgot/reset password"
```

---

## Task 9: TokenCleanupScheduler

**Files:**
- Create: `backend/src/main/kotlin/com/investment/config/TokenCleanupScheduler.kt`

- [ ] **Step 1: Create scheduler**

Create `backend/src/main/kotlin/com/investment/config/TokenCleanupScheduler.kt`:

```kotlin
package com.investment.config

import com.investment.infrastructure.VerificationTokenRepository
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

@Component
class TokenCleanupScheduler(
    private val tokenRepository: VerificationTokenRepository
) {

    private val log = LoggerFactory.getLogger(TokenCleanupScheduler::class.java)

    @Scheduled(cron = "0 0 3 * * *")
    fun cleanupExpiredTokens() {
        tokenRepository.deleteExpired()
        log.info("Cleaned up expired verification tokens")
    }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && ./gradlew classes`
Expected: BUILD SUCCESSFUL

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/kotlin/com/investment/config/TokenCleanupScheduler.kt
git commit -m "feat: add daily cleanup scheduler for expired verification tokens"
```

---

## Task 10: Backend Tests

**Files:**
- Modify: `backend/src/test/kotlin/com/investment/application/UserServiceTest.kt`

- [ ] **Step 1: Rewrite UserServiceTest**

Replace the full content of `backend/src/test/kotlin/com/investment/application/UserServiceTest.kt`:

```kotlin
package com.investment.application

import com.investment.domain.ConflictException
import com.investment.domain.EmailNotVerifiedException
import com.investment.domain.RateLimitException
import com.investment.domain.UnauthorizedException
import com.investment.infrastructure.UserRecord
import com.investment.infrastructure.UserRepository
import com.investment.infrastructure.VerificationTokenRecord
import com.investment.infrastructure.VerificationTokenRepository
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.kotlin.*
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import java.time.Clock
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.util.UUID

class UserServiceTest {

    private val userRepository = mock<UserRepository>()
    private val tokenRepository = mock<VerificationTokenRepository>()
    private val emailService = mock<EmailService>()
    private val fixedClock = Clock.fixed(Instant.parse("2026-04-21T12:00:00Z"), ZoneId.of("UTC"))
    private val encoder = BCryptPasswordEncoder()

    private val service = UserService(
        userRepository, tokenRepository, emailService, fixedClock, registrationEnabled = true
    )

    // --- Registration ---

    @Test
    fun `register creates unverified user, sends verification email, returns message`() {
        val userId = UUID.randomUUID()
        whenever(userRepository.findByEmail("alice@example.com")).thenReturn(null)
        whenever(userRepository.insert(eq("alice@example.com"), any())).thenReturn(userId)
        whenever(tokenRepository.insert(eq(userId), any(), eq("VERIFY_EMAIL"), any())).thenReturn(UUID.randomUUID())

        val message = service.register("alice@example.com", "secret123")

        assertEquals("Check your email to verify your account", message)
        verify(emailService).sendVerificationEmail(eq("alice@example.com"), any())
    }

    @Test
    fun `register throws ConflictException when email already registered`() {
        whenever(userRepository.findByEmail("alice@example.com")).thenReturn(
            UserRecord(UUID.randomUUID(), "alice@example.com", "hash", false)
        )

        assertThrows<ConflictException> {
            service.register("alice@example.com", "password123")
        }
    }

    @Test
    fun `register throws IllegalArgumentException for invalid email`() {
        assertThrows<IllegalArgumentException> { service.register("not-an-email", "password123") }
    }

    @Test
    fun `register throws IllegalArgumentException for short password`() {
        assertThrows<IllegalArgumentException> { service.register("alice@example.com", "short") }
    }

    @Test
    fun `register throws UnauthorizedException when registration is disabled`() {
        val disabledService = UserService(
            userRepository, tokenRepository, emailService, fixedClock, registrationEnabled = false
        )
        assertThrows<UnauthorizedException> {
            disabledService.register("alice@example.com", "password123")
        }
    }

    // --- Email Verification ---

    @Test
    fun `verifyEmail sets email_verified for valid unexpired token`() {
        val userId = UUID.randomUUID()
        val tokenRecord = VerificationTokenRecord(
            id = UUID.randomUUID(),
            userId = userId,
            token = "abc123",
            tokenType = "VERIFY_EMAIL",
            expiresAt = LocalDateTime.now(fixedClock).plusMinutes(30),
            createdAt = LocalDateTime.now(fixedClock).minusMinutes(10)
        )
        whenever(tokenRepository.findByToken("abc123")).thenReturn(tokenRecord)

        service.verifyEmail("abc123")

        verify(userRepository).setEmailVerified(userId)
        verify(tokenRepository).deleteByToken("abc123")
    }

    @Test
    fun `verifyEmail throws for expired token`() {
        val tokenRecord = VerificationTokenRecord(
            id = UUID.randomUUID(),
            userId = UUID.randomUUID(),
            token = "expired",
            tokenType = "VERIFY_EMAIL",
            expiresAt = LocalDateTime.now(fixedClock).minusMinutes(1),
            createdAt = LocalDateTime.now(fixedClock).minusHours(2)
        )
        whenever(tokenRepository.findByToken("expired")).thenReturn(tokenRecord)

        assertThrows<IllegalArgumentException> { service.verifyEmail("expired") }
    }

    @Test
    fun `verifyEmail throws for nonexistent token`() {
        whenever(tokenRepository.findByToken("nope")).thenReturn(null)
        assertThrows<IllegalArgumentException> { service.verifyEmail("nope") }
    }

    // --- Login ---

    @Test
    fun `login returns AuthResponse for verified user with correct password`() {
        val userId = UUID.randomUUID()
        val hash = encoder.encode("correct-password")
        whenever(userRepository.findByEmail("alice@example.com")).thenReturn(
            UserRecord(userId, "alice@example.com", hash, true)
        )

        val result = service.login("alice@example.com", "correct-password")

        assertEquals(userId, result.userId)
        assertEquals("alice@example.com", result.email)
    }

    @Test
    fun `login throws EmailNotVerifiedException for unverified user`() {
        val hash = encoder.encode("correct-password")
        whenever(userRepository.findByEmail("alice@example.com")).thenReturn(
            UserRecord(UUID.randomUUID(), "alice@example.com", hash, false)
        )

        assertThrows<EmailNotVerifiedException> {
            service.login("alice@example.com", "correct-password")
        }
    }

    @Test
    fun `login throws UnauthorizedException for wrong password`() {
        val hash = encoder.encode("real-password")
        whenever(userRepository.findByEmail("alice@example.com")).thenReturn(
            UserRecord(UUID.randomUUID(), "alice@example.com", hash, true)
        )

        assertThrows<UnauthorizedException> {
            service.login("alice@example.com", "wrong-password")
        }
    }

    @Test
    fun `login throws UnauthorizedException for unknown email`() {
        whenever(userRepository.findByEmail("nobody@example.com")).thenReturn(null)

        assertThrows<UnauthorizedException> {
            service.login("nobody@example.com", "anything")
        }
    }

    // --- Resend Verification ---

    @Test
    fun `resendVerification sends new email for unverified user`() {
        val userId = UUID.randomUUID()
        whenever(userRepository.findByEmail("alice@example.com")).thenReturn(
            UserRecord(userId, "alice@example.com", "hash", false)
        )
        whenever(tokenRepository.findLatestByUserIdAndType(userId, "VERIFY_EMAIL")).thenReturn(null)
        whenever(tokenRepository.insert(eq(userId), any(), eq("VERIFY_EMAIL"), any())).thenReturn(UUID.randomUUID())

        service.resendVerification("alice@example.com")

        verify(tokenRepository).deleteByUserIdAndType(userId, "VERIFY_EMAIL")
        verify(emailService).sendVerificationEmail(eq("alice@example.com"), any())
    }

    @Test
    fun `resendVerification does nothing for unknown email (no enumeration)`() {
        whenever(userRepository.findByEmail("nobody@example.com")).thenReturn(null)

        service.resendVerification("nobody@example.com")

        verifyNoInteractions(emailService)
    }

    @Test
    fun `resendVerification throws RateLimitException if token created less than 2 minutes ago`() {
        val userId = UUID.randomUUID()
        whenever(userRepository.findByEmail("alice@example.com")).thenReturn(
            UserRecord(userId, "alice@example.com", "hash", false)
        )
        val recentToken = VerificationTokenRecord(
            id = UUID.randomUUID(),
            userId = userId,
            token = "recent",
            tokenType = "VERIFY_EMAIL",
            expiresAt = LocalDateTime.now(fixedClock).plusMinutes(59),
            createdAt = LocalDateTime.now(fixedClock).minusSeconds(30)
        )
        whenever(tokenRepository.findLatestByUserIdAndType(userId, "VERIFY_EMAIL")).thenReturn(recentToken)

        assertThrows<RateLimitException> {
            service.resendVerification("alice@example.com")
        }
    }

    // --- Password Reset ---

    @Test
    fun `forgotPassword sends reset email for verified user`() {
        val userId = UUID.randomUUID()
        whenever(userRepository.findByEmail("alice@example.com")).thenReturn(
            UserRecord(userId, "alice@example.com", "hash", true)
        )
        whenever(tokenRepository.insert(eq(userId), any(), eq("RESET_PASSWORD"), any())).thenReturn(UUID.randomUUID())

        service.forgotPassword("alice@example.com")

        verify(emailService).sendPasswordResetEmail(eq("alice@example.com"), any())
    }

    @Test
    fun `forgotPassword does nothing for unknown email (no enumeration)`() {
        whenever(userRepository.findByEmail("nobody@example.com")).thenReturn(null)

        service.forgotPassword("nobody@example.com")

        verifyNoInteractions(emailService)
    }

    @Test
    fun `resetPassword updates hash for valid token`() {
        val userId = UUID.randomUUID()
        val tokenRecord = VerificationTokenRecord(
            id = UUID.randomUUID(),
            userId = userId,
            token = "reset-tok",
            tokenType = "RESET_PASSWORD",
            expiresAt = LocalDateTime.now(fixedClock).plusMinutes(30),
            createdAt = LocalDateTime.now(fixedClock).minusMinutes(5)
        )
        whenever(tokenRepository.findByToken("reset-tok")).thenReturn(tokenRecord)

        service.resetPassword("reset-tok", "newpassword123")

        verify(userRepository).updatePasswordHash(eq(userId), any())
        verify(tokenRepository).deleteByToken("reset-tok")
    }

    @Test
    fun `resetPassword throws for expired token`() {
        val tokenRecord = VerificationTokenRecord(
            id = UUID.randomUUID(),
            userId = UUID.randomUUID(),
            token = "expired-reset",
            tokenType = "RESET_PASSWORD",
            expiresAt = LocalDateTime.now(fixedClock).minusMinutes(1),
            createdAt = LocalDateTime.now(fixedClock).minusHours(2)
        )
        whenever(tokenRepository.findByToken("expired-reset")).thenReturn(tokenRecord)

        assertThrows<IllegalArgumentException> { service.resetPassword("expired-reset", "newpassword123") }
    }

    @Test
    fun `resetPassword throws for short new password`() {
        assertThrows<IllegalArgumentException> { service.resetPassword("any-token", "short") }
    }
}
```

- [ ] **Step 2: Run tests**

Run: `cd backend && ./gradlew test --tests "com.investment.application.UserServiceTest"`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add backend/src/test/kotlin/com/investment/application/UserServiceTest.kt
git commit -m "test: rewrite UserServiceTest for email verification and password reset"
```

---

## Task 11: Frontend API Client

**Files:**
- Modify: `frontend/src/api/auth.ts`

- [ ] **Step 1: Update auth.ts**

Replace the full content of `frontend/src/api/auth.ts`:

```typescript
import client from './client'

export interface AuthUser {
  userId: string
  email: string
}

export interface MessageResponse {
  message: string
}

export const login = (email: string, password: string) =>
  client.post<AuthUser>('/api/auth/login', { email, password })

export const register = (email: string, password: string) =>
  client.post<MessageResponse>('/api/auth/register', { email, password })

export const logout = () => client.post('/api/auth/logout')

export const getMe = () => client.get<AuthUser>('/api/auth/me')

export const verifyEmail = (token: string) =>
  client.post<MessageResponse>('/api/auth/verify-email', { token })

export const resendVerification = (email: string) =>
  client.post<MessageResponse>('/api/auth/resend-verification', { email })

export const forgotPassword = (email: string) =>
  client.post<MessageResponse>('/api/auth/forgot-password', { email })

export const resetPassword = (token: string, newPassword: string) =>
  client.post<MessageResponse>('/api/auth/reset-password', { token, newPassword })
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/auth.ts
git commit -m "feat: update frontend auth API client for email-based auth"
```

---

## Task 12: RegisterPage — email field + check-your-email state

**Files:**
- Modify: `frontend/src/features/auth/RegisterPage.tsx`

- [ ] **Step 1: Rewrite RegisterPage**

Replace the full content of `frontend/src/features/auth/RegisterPage.tsx`:

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { register, resendVerification } from '@/api/auth'
import { AllocaLogo } from '@/components/shared/AllocaLogo'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendDisabled, setResendDisabled] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setSubmitting(true)
    try {
      await register(email, password)
      setEmailSent(true)
    } catch (err: any) {
      const msg = err?.response?.data?.error
      setError(msg ?? 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    setResending(true)
    try {
      await resendVerification(email)
      setResendDisabled(true)
      setTimeout(() => setResendDisabled(false), 120_000)
    } catch {
      // silently fail — don't reveal account existence
    } finally {
      setResending(false)
    }
  }

  if (emailSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <AllocaLogo className="h-10 w-auto text-foreground" />
          </div>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            We sent a verification link to <span className="font-medium text-foreground">{email}</span>
          </p>
          <button
            onClick={handleResend}
            disabled={resending || resendDisabled}
            className="text-sm font-medium text-primary hover:underline disabled:opacity-50 disabled:no-underline"
          >
            {resending ? 'Sending...' : resendDisabled ? 'Email sent — check your inbox' : "Didn't receive it? Resend"}
          </button>
          <p className="text-sm text-muted-foreground">
            <Link to="/login" className="font-medium text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3">
          <AllocaLogo className="h-10 w-auto text-foreground" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Create account</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex h-10 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/auth/RegisterPage.tsx
git commit -m "feat: update RegisterPage for email-based signup with verification flow"
```

---

## Task 13: LoginPage — email field + forgot password + resend on 403

**Files:**
- Modify: `frontend/src/features/auth/LoginPage.tsx`

- [ ] **Step 1: Rewrite LoginPage**

Replace the full content of `frontend/src/features/auth/LoginPage.tsx`:

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { login, resendVerification } from '@/api/auth'
import { AllocaLogo } from '@/components/shared/AllocaLogo'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [emailNotVerified, setEmailNotVerified] = useState(false)
  const [resending, setResending] = useState(false)
  const [resentSuccess, setResentSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setEmailNotVerified(false)
    setResentSuccess(false)
    setSubmitting(true)
    try {
      await login(email, password)
      window.location.href = '/'
    } catch (err: any) {
      const code = err?.response?.data?.code
      const msg = err?.response?.data?.error
      if (code === 'EMAIL_NOT_VERIFIED') {
        setEmailNotVerified(true)
        setError('Please verify your email before signing in.')
      } else {
        setError(msg ?? 'Invalid credentials')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    setResending(true)
    try {
      await resendVerification(email)
      setResentSuccess(true)
    } catch {
      // silently fail
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3">
          <AllocaLogo className="h-10 w-auto text-foreground" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Sign in</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
              {emailNotVerified && (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || resentSuccess}
                  className="mt-2 block text-sm font-medium text-primary hover:underline disabled:opacity-50"
                >
                  {resending ? 'Sending...' : resentSuccess ? 'Verification email sent!' : 'Resend verification email'}
                </button>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex h-10 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/auth/LoginPage.tsx
git commit -m "feat: update LoginPage for email-based login with forgot password and resend verification"
```

---

## Task 14: New Frontend Pages — VerifyEmail, ForgotPassword, ResetPassword

**Files:**
- Create: `frontend/src/features/auth/VerifyEmailPage.tsx`
- Create: `frontend/src/features/auth/ForgotPasswordPage.tsx`
- Create: `frontend/src/features/auth/ResetPasswordPage.tsx`

- [ ] **Step 1: Create VerifyEmailPage**

Create `frontend/src/features/auth/VerifyEmailPage.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { verifyEmail } from '@/api/auth'
import { AllocaLogo } from '@/components/shared/AllocaLogo'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMsg('Missing verification token')
      return
    }
    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error')
        setErrorMsg(err?.response?.data?.error ?? 'Verification failed')
      })
  }, [token])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <AllocaLogo className="mx-auto h-10 w-auto text-foreground" />

        {status === 'loading' && (
          <p className="text-sm text-muted-foreground">Verifying your email...</p>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Email verified!</h1>
            <p className="text-sm text-muted-foreground">Your account is now active. You can sign in.</p>
            <Link
              to="/login"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Sign in
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Verification failed</h1>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <Link to="/register" className="text-sm font-medium text-primary hover:underline">
              Register again
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create ForgotPasswordPage**

Create `frontend/src/features/auth/ForgotPasswordPage.tsx`:

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '@/api/auth'
import { AllocaLogo } from '@/components/shared/AllocaLogo'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await forgotPassword(email)
    } catch {
      // always show success to prevent enumeration
    } finally {
      setSubmitting(false)
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <AllocaLogo className="mx-auto h-10 w-auto text-foreground" />
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            If an account exists for <span className="font-medium text-foreground">{email}</span>, we sent a password reset link.
          </p>
          <Link to="/login" className="text-sm font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3">
          <AllocaLogo className="h-10 w-auto text-foreground" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Forgot password</h1>
          <p className="text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex h-10 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create ResetPasswordPage**

Create `frontend/src/features/auth/ResetPasswordPage.tsx`:

```tsx
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resetPassword } from '@/api/auth'
import { AllocaLogo } from '@/components/shared/AllocaLogo'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <AllocaLogo className="mx-auto h-10 w-auto text-foreground" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Invalid link</h1>
          <p className="text-sm text-muted-foreground">This password reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            Request a new link
          </Link>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setSubmitting(true)
    try {
      await resetPassword(token!, password)
      setSuccess(true)
    } catch (err: any) {
      const msg = err?.response?.data?.error
      setError(msg ?? 'Password reset failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <AllocaLogo className="mx-auto h-10 w-auto text-foreground" />
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Password updated!</h1>
          <p className="text-sm text-muted-foreground">You can now sign in with your new password.</p>
          <Link
            to="/login"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3">
          <AllocaLogo className="h-10 w-auto text-foreground" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Set new password</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              New password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex h-10 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? 'Updating...' : 'Update password'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/auth/VerifyEmailPage.tsx \
       frontend/src/features/auth/ForgotPasswordPage.tsx \
       frontend/src/features/auth/ResetPasswordPage.tsx
git commit -m "feat: add VerifyEmail, ForgotPassword, and ResetPassword pages"
```

---

## Task 15: App Routes + AuthContext update

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/features/auth/AuthContext.tsx`

- [ ] **Step 1: Add new routes to App.tsx**

In `frontend/src/App.tsx`, add the imports at the top (after the existing auth page imports):

```typescript
import VerifyEmailPage from './features/auth/VerifyEmailPage'
import ForgotPasswordPage from './features/auth/ForgotPasswordPage'
import ResetPasswordPage from './features/auth/ResetPasswordPage'
```

Then in the `App` function's `<Routes>`, add the new public routes after the `/register` route:

```tsx
<Route path="/verify-email" element={<VerifyEmailPage />} />
<Route path="/forgot-password" element={<ForgotPasswordPage />} />
<Route path="/reset-password" element={<ResetPasswordPage />} />
```

- [ ] **Step 2: Update AuthContext (no code change needed)**

The `AuthContext.tsx` imports `AuthUser` from `@/api/auth`. Since we updated `AuthUser` to use `email` instead of `username` in Task 11, the `AuthContext` will automatically pick up the change. No code modifications needed in this file.

Verify by checking that `AuthContext.tsx` doesn't reference `.username` directly — it doesn't; it just passes the `user` object through.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: add routes for email verification, forgot password, and reset password"
```

---

## Task 16: Final Verification

- [ ] **Step 1: Build backend**

Run: `cd backend && ./gradlew build`
Expected: BUILD SUCCESSFUL (compilation + tests pass)

- [ ] **Step 2: Build frontend**

Run: `cd frontend && npm run build`
Expected: Build succeeds with no TypeScript errors

- [ ] **Step 3: Check for any remaining username references**

Run: `rg "username" --type kotlin --type ts --type tsx backend/src frontend/src`
Expected: No matches in auth-related files (there may be matches in unrelated files which is fine)

- [ ] **Step 4: Commit any fixes if needed**

If step 3 reveals leftover `username` references in auth files, fix them and commit.
