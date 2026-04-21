# Email Verification & Password Reset

**Date:** 2026-04-21
**Status:** Design approved, pending implementation

## Summary

Replace username-based registration with email-based signup that requires email verification before the account becomes active. Add password reset flow using the same token infrastructure. Wipe all existing users (early production, agreed with stakeholder).

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Token storage | Database-backed (`verification_tokens` table) | Single-use enforcement, revocable, queryable, fits existing raw-SQL style |
| Token expiry | 1 hour | Reasonable balance between security and convenience |
| Existing users | Wipe and re-register | Early enough in production; avoids legacy migration complexity |
| Email provider | Configurable via env vars; Gmail SMTP free tier to start | Zero cost; swap to SendGrid/Resend later by changing env vars only |
| From address | Configurable (`MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`) | Defers domain decision without blocking development |
| Local dev | Console logging fallback when `SPRING_MAIL_HOST` is empty | No SMTP needed for local development |
| Password reset | Included in this feature | Same token plumbing; nearly free to add alongside verification |

## 1. Database Schema

### Migration: `V16__email_verification.sql`

**Step 1 — Wipe all existing data** (same TRUNCATE CASCADE pattern as V15):

```sql
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
```

**Step 2 — Alter `users` table:**

- Rename `username` column to `email` (VARCHAR(255), UNIQUE, NOT NULL)
- Add `email_verified` (BOOLEAN NOT NULL DEFAULT FALSE)

```sql
ALTER TABLE users RENAME COLUMN username TO email;
ALTER TABLE users ALTER COLUMN email TYPE VARCHAR(255);
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;
```

**Step 3 — Create `verification_tokens` table:**

```sql
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

**Constraints:**
- `token_type` must be one of: `VERIFY_EMAIL`, `RESET_PASSWORD`
- `ON DELETE CASCADE` ensures tokens are cleaned up when user is deleted

## 2. Backend Auth Flow

### Registration

1. `POST /api/auth/register` receives `{ email, password }`
2. Validate email format (regex or Jakarta `@Email`) and password >= 8 chars
3. Check email uniqueness (case-insensitive)
4. Insert user with `email_verified = false`
5. Generate 32-byte secure random token (hex-encoded = 64 chars)
6. Insert into `verification_tokens` (type `VERIFY_EMAIL`, expires = now + 1 hour)
7. Send verification email with link: `{FRONTEND_URL}/verify-email?token={token}`
8. Return `201` with `{ message: "Check your email to verify your account" }`
9. **Do NOT set auth cookie** — account is inactive

### Email verification

1. `POST /api/auth/verify-email` receives `{ token }`
2. Look up token in `verification_tokens` where `token_type = VERIFY_EMAIL`
3. Validate: token exists, not expired
4. Set `email_verified = true` on the associated user
5. Delete the token (single-use)
6. Return `200` with `{ message: "Email verified" }`

### Login

1. `POST /api/auth/login` receives `{ email, password }`
2. Find user by email (case-insensitive)
3. Verify password with BCrypt
4. **New check:** if `email_verified = false`, return `403` with `{ error: "Email not verified", code: "EMAIL_NOT_VERIFIED" }`
5. On success, set auth cookie (same as today)
6. Return `200` with `{ userId, email }`

### Resend verification

1. `POST /api/auth/resend-verification` receives `{ email }`
2. Find user by email
3. If user does not exist or `email_verified = true`, **still return `200`** (prevents enumeration)
4. Rate limit: check `verification_tokens` for this user — if a `VERIFY_EMAIL` token was created less than 2 minutes ago, return `429`
5. Delete any existing `VERIFY_EMAIL` tokens for this user
6. Create new token, send new email
7. Return `200` with `{ message: "Verification email sent" }`

### Forgot password

1. `POST /api/auth/forgot-password` receives `{ email }`
2. If user exists and `email_verified = true`:
   - Delete existing `RESET_PASSWORD` tokens for this user
   - Create new token, send reset email with link: `{FRONTEND_URL}/reset-password?token={token}`
3. **Always return `200`** with `{ message: "If an account exists, we sent a reset link" }` (prevents user enumeration)

### Reset password

1. `POST /api/auth/reset-password` receives `{ token, newPassword }`
2. Look up token where `token_type = RESET_PASSWORD`
3. Validate: token exists, not expired
4. Validate new password >= 8 chars
5. Update user's `password_hash` with BCrypt of new password
6. Delete the token
7. Return `200` with `{ message: "Password updated" }`

### Token cleanup

`@Scheduled(cron = "0 0 3 * * *")` daily job deletes all rows where `expires_at < NOW()`.

### Public paths

Add to `JwtAuthFilter.publicPaths`:
- `/api/auth/verify-email`
- `/api/auth/resend-verification`
- `/api/auth/forgot-password`
- `/api/auth/reset-password`

## 3. Email Service & Configuration

### `application.yml` additions

```yaml
spring:
  mail:
    host: ${SPRING_MAIL_HOST:}
    port: ${SPRING_MAIL_PORT:587}
    username: ${SPRING_MAIL_USERNAME:}
    password: ${SPRING_MAIL_PASSWORD:}
    properties:
      mail.smtp.auth: true
      mail.smtp.starttls.enable: true

app:
  mail:
    from-address: ${MAIL_FROM_ADDRESS:noreply@example.com}
    from-name: ${MAIL_FROM_NAME:Alloca}
  frontend-url: ${FRONTEND_URL:http://localhost:3000}
```

### `EmailService.kt`

- Wraps Spring `JavaMailSender`
- Two methods: `sendVerificationEmail(toEmail, token)`, `sendPasswordResetEmail(toEmail, token)`
- Builds HTML email with inline CSS (email-client compatible, no Thymeleaf)
- **Dev fallback:** when `SPRING_MAIL_HOST` is blank, logs the full link to console instead of sending

### Email content

Both emails follow the same minimal template:
- App name header
- One-sentence instruction
- Prominent CTA button with the link
- "This link expires in 1 hour" note
- "If you didn't request this, ignore this email" footer

## 4. Frontend Changes

### Registration (`RegisterPage.tsx`)

- Replace "Username" input with "Email" (`type="email"`, `autoComplete="email"`)
- On success: instead of redirecting to `/`, show a "Check your email" confirmation screen:
  - Envelope icon
  - "We sent a verification link to **{email}**"
  - "Didn't receive it?" button (calls resend endpoint, disabled for 2 min after use)
  - "Back to sign in" link

### Login (`LoginPage.tsx`)

- Replace "Username" input with "Email" (`type="email"`, `autoComplete="email"`)
- When error code is `EMAIL_NOT_VERIFIED`, show specific message with "Resend verification email" button
- Add "Forgot password?" link below the form, routes to `/forgot-password`

### New: Verify Email Page (`VerifyEmailPage.tsx`)

- Route: `/verify-email?token=...`
- On mount: `POST /api/auth/verify-email` with token from URL params
- States: loading, success ("Email verified! You can now sign in." + button), error ("Link expired or invalid" + "Request a new link")

### New: Forgot Password Page (`ForgotPasswordPage.tsx`)

- Route: `/forgot-password`
- Email input + submit
- On submit: `POST /api/auth/forgot-password`
- Always shows: "If an account exists for that email, we sent a reset link"
- "Back to sign in" link

### New: Reset Password Page (`ResetPasswordPage.tsx`)

- Route: `/reset-password?token=...`
- New password + confirm password inputs
- On submit: `POST /api/auth/reset-password` with token + new password
- Success: "Password updated!" + "Sign in" link
- Error: "Link expired or invalid"

### API Client (`auth.ts`)

- Rename `username` to `email` in existing `login()`, `register()`
- Add: `verifyEmail(token)`, `resendVerification(email)`, `forgotPassword(email)`, `resetPassword(token, newPassword)`
- Update `AuthUser` type: `username` -> `email`

### Routes (`App.tsx`)

Add public (unauthenticated) routes:
- `/verify-email` -> `VerifyEmailPage`
- `/forgot-password` -> `ForgotPasswordPage`
- `/reset-password` -> `ResetPasswordPage`

## 5. DTOs

### Backend

**`AuthRequest.kt`** — rename `username` to `email`

**`AuthResponse.kt`** — rename `username` to `email`

**New DTOs:**
- `VerifyEmailRequest(token: String)`
- `ResendVerificationRequest(email: String)`
- `ForgotPasswordRequest(email: String)`
- `ResetPasswordRequest(token: String, newPassword: String)`
- `MessageResponse(message: String)` (generic success response)

### Frontend

**`AuthUser`** — rename `username` to `email`

## 6. Files Touched

### Backend (new)
- `V16__email_verification.sql`
- `VerificationTokenRepository.kt`
- `EmailService.kt`
- `TokenCleanupScheduler.kt`
- New DTO files (VerifyEmailRequest, ResendVerificationRequest, ForgotPasswordRequest, ResetPasswordRequest, MessageResponse)

### Backend (modified)
- `UserRepository.kt` — email instead of username, `email_verified` in queries and `UserRecord`
- `UserService.kt` — registration flow (no cookie), verification, resend, forgot/reset password
- `AuthController.kt` — new endpoints, email instead of username
- `AuthRequest.kt` — `username` -> `email`
- `AuthResponse.kt` — `username` -> `email`
- `JwtAuthFilter.kt` — add public paths
- `application.yml` — mail + frontend-url config

### Frontend (new)
- `VerifyEmailPage.tsx`
- `ForgotPasswordPage.tsx`
- `ResetPasswordPage.tsx`

### Frontend (modified)
- `RegisterPage.tsx` — email field + check-your-email state
- `LoginPage.tsx` — email field + forgot password + resend verification
- `auth.ts` — new API functions, email instead of username
- `App.tsx` — new routes

### Tests
- Update `UserServiceTest.kt` for new registration flow, verification, and reset
- Add `EmailService` tests (mock `JavaMailSender`)
- Add `VerificationTokenRepository` tests

## 7. Environment Variables (new)

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `SPRING_MAIL_HOST` | No (logs to console if empty) | empty | SMTP server host |
| `SPRING_MAIL_PORT` | No | `587` | SMTP server port |
| `SPRING_MAIL_USERNAME` | No | empty | SMTP username |
| `SPRING_MAIL_PASSWORD` | No | empty | SMTP password |
| `MAIL_FROM_ADDRESS` | No | `noreply@example.com` | Sender email address |
| `MAIL_FROM_NAME` | No | `Alloca` | Sender display name |
| `FRONTEND_URL` | No | `http://localhost:3000` | Base URL for verification/reset links |
