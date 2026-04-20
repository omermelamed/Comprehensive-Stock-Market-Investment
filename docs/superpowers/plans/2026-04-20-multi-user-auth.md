# Multi-User Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the single-user investment platform into a multi-user system where each user registers with username/password, gets a JWT cookie, and sees only their own data.

**Architecture:** Manual JWT filter (no Spring Security) reads an `HttpOnly` cookie named `auth_token` on every request and stores the user's UUID in a `RequestContext` ThreadLocal. All repository queries gain a `userId` parameter. Background schedulers iterate all users by querying `UserRepository.findAllIds()`.

**Tech Stack:** Spring Boot (Kotlin), JJWT 0.12.6, spring-security-crypto (bcrypt), jOOQ, Flyway, React + TypeScript, Axios

**Design spec:** `docs/superpowers/specs/2026-04-20-multi-user-auth-design.md`

---

## File Map

### New backend files
| File | Purpose |
|---|---|
| `backend/src/main/resources/db/migration/V15__multi_user_auth.sql` | Create `users` table, wipe old data, add `user_id` to all tables, recreate views |
| `backend/src/main/kotlin/com/investment/domain/UnauthorizedException.kt` | Maps to 401 via GlobalExceptionHandler |
| `backend/src/main/kotlin/com/investment/config/RequestContext.kt` | ThreadLocal UUID holder |
| `backend/src/main/kotlin/com/investment/application/JwtService.kt` | Generate + validate JWTs |
| `backend/src/main/kotlin/com/investment/config/JwtAuthFilter.kt` | OncePerRequestFilter; cookie → JWT → RequestContext |
| `backend/src/main/kotlin/com/investment/config/FilterConfig.kt` | Registers JwtAuthFilter as Spring bean |
| `backend/src/main/kotlin/com/investment/infrastructure/UserRepository.kt` | CRUD for `users` table |
| `backend/src/main/kotlin/com/investment/application/UserService.kt` | Register + login with bcrypt |
| `backend/src/main/kotlin/com/investment/api/dto/AuthRequest.kt` | `{ username, password }` |
| `backend/src/main/kotlin/com/investment/api/dto/AuthResponse.kt` | `{ userId, username }` |
| `backend/src/main/kotlin/com/investment/api/AuthController.kt` | /api/auth/register, /login, /logout, /me |

### Modified backend files
| File | Change |
|---|---|
| `backend/build.gradle.kts` | Add JJWT + spring-security-crypto deps |
| `backend/src/main/resources/application.yml` | Add `app.jwt.secret` and `app.jwt.expiry-days` |
| `backend/src/main/kotlin/com/investment/api/GlobalExceptionHandler.kt` | Add 401 handler for UnauthorizedException |
| `backend/src/main/kotlin/com/investment/infrastructure/UserProfileRepository.kt` | All methods gain `userId: UUID` |
| `backend/src/main/kotlin/com/investment/application/UserProfileService.kt` | Calls `RequestContext.get()` |
| `backend/src/main/kotlin/com/investment/infrastructure/TransactionRepository.kt` | All methods gain `userId: UUID` |
| `backend/src/main/kotlin/com/investment/infrastructure/HoldingsProjectionRepository.kt` | All methods gain `userId: UUID` |
| `backend/src/main/kotlin/com/investment/infrastructure/AllocationRepository.kt` | All methods gain `userId: UUID`; ON CONFLICT updated |
| `backend/src/main/kotlin/com/investment/application/AllocationService.kt` | Calls `RequestContext.get()` |
| `backend/src/main/kotlin/com/investment/infrastructure/SnapshotRepository.kt` | All methods gain `userId: UUID` |
| `backend/src/main/kotlin/com/investment/application/SnapshotService.kt` | All public methods gain `userId: UUID` parameter |
| `backend/src/main/kotlin/com/investment/application/CatchUpService.kt` | Iterates all users |
| `backend/src/main/kotlin/com/investment/infrastructure/DailySnapshotScheduler.kt` | Iterates all users |
| `backend/src/main/kotlin/com/investment/infrastructure/WatchlistRepository.kt` | All methods gain `userId: UUID` |
| `backend/src/main/kotlin/com/investment/infrastructure/AlertRepository.kt` | User-facing methods gain `userId: UUID`; `findActive()` returns alerts WITH user_id |
| `backend/src/main/kotlin/com/investment/infrastructure/OptionsTransactionRepository.kt` | All methods gain `userId: UUID` |
| `backend/src/main/kotlin/com/investment/infrastructure/RiskScoreHistoryRepository.kt` | All methods gain `userId: UUID` |
| `backend/src/main/kotlin/com/investment/infrastructure/RecommendationCacheRepository.kt` | All methods gain `userId: UUID` |
| `backend/src/main/kotlin/com/investment/infrastructure/MonthlyInvestmentSessionRepository.kt` | All methods gain `userId: UUID` |
| `backend/src/main/kotlin/com/investment/infrastructure/TelegramConversationRepository.kt` | Scoped by `userId` |
| `backend/src/main/kotlin/com/investment/infrastructure/TelegramScheduledMessageRepository.kt` | Scoped by `userId` |
| `backend/src/main/kotlin/com/investment/infrastructure/TelegramPendingConfirmationRepository.kt` | Scoped by `userId` |
| All services that call the above repos | Pass `userId` from `RequestContext.get()` |

### New frontend files
| File | Purpose |
|---|---|
| `frontend/src/api/auth.ts` | login(), register(), logout(), getMe() |
| `frontend/src/features/auth/AuthContext.tsx` | AuthContext + AuthProvider |
| `frontend/src/features/auth/useAuth.ts` | Hook to consume AuthContext |
| `frontend/src/features/auth/LoginPage.tsx` | Login form page |
| `frontend/src/features/auth/RegisterPage.tsx` | Register form page |
| `frontend/src/components/shared/ProtectedRoute.tsx` | Auth gate wrapper |

### Modified frontend files
| File | Change |
|---|---|
| `frontend/src/api/client.ts` | Add `withCredentials: true`, 401 interceptor |
| `frontend/src/App.tsx` | Add auth flow; wrap routes in ProtectedRoute |
| `frontend/src/layouts/app-layout.tsx` | Add logout button |

---

## Task 1: V15 Database Migration

**Files:**
- Create: `backend/src/main/resources/db/migration/V15__multi_user_auth.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- V15: Multi-user authentication
-- Creates users table, wipes all single-user data, adds user_id to all tables

-- ============================================================
-- 1. Create the users table
-- ============================================================
CREATE TABLE users (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. Wipe all existing user data (fresh start)
-- ============================================================
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
    user_profile
CASCADE;

-- ============================================================
-- 3. Add user_id to all data tables
-- ============================================================
ALTER TABLE user_profile               ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
ALTER TABLE transactions                ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
ALTER TABLE target_allocations          ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
ALTER TABLE portfolio_snapshots         ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
ALTER TABLE alerts                      ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
ALTER TABLE watchlist                   ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
ALTER TABLE options_transactions        ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
ALTER TABLE risk_score_history          ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
ALTER TABLE ai_recommendation_cache     ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
ALTER TABLE monthly_investment_sessions ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
ALTER TABLE telegram_conversations      ADD COLUMN user_id UUID REFERENCES users(id);
ALTER TABLE telegram_scheduled_messages ADD COLUMN user_id UUID REFERENCES users(id);
ALTER TABLE telegram_pending_confirmations ADD COLUMN user_id UUID REFERENCES users(id);

-- ============================================================
-- 4. Update unique constraints to be per-user
-- ============================================================

-- user_profile: was single-row; now one per user
DROP INDEX idx_user_profile_single_row;
CREATE UNIQUE INDEX idx_user_profile_user ON user_profile (user_id);

-- target_allocations: symbol unique per user
DROP INDEX idx_target_allocations_symbol;
CREATE UNIQUE INDEX idx_target_allocations_symbol ON target_allocations (user_id, UPPER(symbol));

-- portfolio_snapshots: one per user per day
DROP INDEX idx_portfolio_snapshots_date;
CREATE UNIQUE INDEX idx_portfolio_snapshots_user_date ON portfolio_snapshots (user_id, date);

-- watchlist: symbol unique per user
DROP INDEX idx_watchlist_symbol;
CREATE UNIQUE INDEX idx_watchlist_symbol ON watchlist (user_id, UPPER(symbol));

-- ai_recommendation_cache: one per user
DROP INDEX idx_ai_cache_single;
CREATE UNIQUE INDEX idx_ai_cache_user ON ai_recommendation_cache (user_id);

-- ============================================================
-- 5. Recreate views to include user_id
-- ============================================================

DROP VIEW IF EXISTS current_holdings;
CREATE VIEW current_holdings AS
SELECT
    user_id,
    symbol,
    track,
    SUM(
        CASE
            WHEN type IN ('BUY')    THEN quantity
            WHEN type IN ('SELL')   THEN -quantity
            WHEN type IN ('SHORT')  THEN -quantity
            WHEN type IN ('COVER')  THEN quantity
            ELSE 0
        END
    )                                                       AS net_quantity,
    SUM(
        CASE
            WHEN type IN ('BUY', 'SHORT')  THEN quantity * price_per_unit
            ELSE 0
        END
    ) /
    NULLIF(SUM(
        CASE
            WHEN type IN ('BUY', 'SHORT')  THEN quantity
            ELSE 0
        END
    ), 0)                                                   AS avg_buy_price,
    SUM(
        CASE
            WHEN type IN ('BUY', 'SHORT')  THEN quantity * price_per_unit
            WHEN type IN ('SELL', 'COVER') THEN -(quantity * price_per_unit)
            ELSE 0
        END
    )                                                       AS total_cost_basis,
    COUNT(*)                                                AS transaction_count,
    MIN(executed_at)                                        AS first_bought_at,
    MAX(executed_at)                                        AS last_transaction_at
FROM transactions
GROUP BY user_id, symbol, track
HAVING SUM(
    CASE
        WHEN type IN ('BUY')    THEN quantity
        WHEN type IN ('SELL')   THEN -quantity
        WHEN type IN ('SHORT')  THEN -quantity
        WHEN type IN ('COVER')  THEN quantity
        ELSE 0
    END
) > 0;

DROP VIEW IF EXISTS active_options;
CREATE VIEW active_options AS
SELECT
    user_id,
    id,
    underlying_symbol,
    option_type,
    action,
    strike_price,
    expiration_date,
    contracts,
    premium_per_contract,
    total_premium,
    (expiration_date - CURRENT_DATE)    AS days_to_expiry,
    status,
    executed_at
FROM options_transactions
WHERE status = 'ACTIVE'
ORDER BY expiration_date;

DROP VIEW IF EXISTS active_alerts;
CREATE VIEW active_alerts AS
SELECT
    user_id,
    id,
    symbol,
    condition,
    threshold_price,
    note,
    created_at
FROM alerts
WHERE is_active = TRUE;

-- Recreate upcoming_scheduled_messages view (was dropped/created in V12 without user_id)
DROP VIEW IF EXISTS upcoming_scheduled_messages;
CREATE VIEW upcoming_scheduled_messages AS
    SELECT * FROM telegram_scheduled_messages
    WHERE is_active = TRUE AND next_send_at <= NOW();
```

- [ ] **Step 2: Verify migration applies cleanly (requires local Postgres running)**

```bash
cd backend
./gradlew flywayInfo
```

Expected: V15 shown as "Pending". Then:

```bash
./gradlew flywayMigrate
```

Expected: `Successfully applied 1 migration to schema "public"`.

If running against Supabase, Flyway will apply it on next app boot.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/resources/db/migration/V15__multi_user_auth.sql
git commit -m "feat: V15 migration — add users table and user_id to all data tables"
```

---

## Task 2: JWT Infrastructure

**Files:**
- Modify: `backend/build.gradle.kts`
- Modify: `backend/src/main/resources/application.yml`
- Create: `backend/src/main/kotlin/com/investment/domain/UnauthorizedException.kt`
- Create: `backend/src/main/kotlin/com/investment/config/RequestContext.kt`
- Create: `backend/src/main/kotlin/com/investment/application/JwtService.kt`
- Create: `backend/src/main/kotlin/com/investment/config/JwtAuthFilter.kt`
- Create: `backend/src/main/kotlin/com/investment/config/FilterConfig.kt`
- Modify: `backend/src/main/kotlin/com/investment/api/GlobalExceptionHandler.kt`

- [ ] **Step 1: Add JJWT and bcrypt dependencies to build.gradle.kts**

Open `backend/build.gradle.kts` and add to the `dependencies` block:

```kotlin
    // JWT
    implementation("io.jsonwebtoken:jjwt-api:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")

    // BCrypt (spring-security-crypto only — no full Spring Security)
    implementation("org.springframework.security:spring-security-crypto:6.3.0")
```

Full updated `dependencies` block (everything in it):

```kotlin
dependencies {
    // Spring Boot
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-mail")

    // Kotlin
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.1")

    // Database — jOOQ + Flyway (no JPA/Hibernate)
    implementation("org.springframework.boot:spring-boot-starter-jooq")
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")
    runtimeOnly("org.postgresql:postgresql")

    // HTTP Client (for external market data APIs)
    implementation("org.springframework.boot:spring-boot-starter-webflux")

    // CSV / Excel import-export
    implementation("org.apache.poi:poi-ooxml:5.2.5")
    implementation("com.opencsv:opencsv:5.9")

    // .env file loading
    implementation("me.paulschwarz:spring-dotenv:4.0.0")

    // JWT
    implementation("io.jsonwebtoken:jjwt-api:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")

    // BCrypt (spring-security-crypto only — no full Spring Security)
    implementation("org.springframework.security:spring-security-crypto:6.3.0")

    // Testing
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}
```

- [ ] **Step 2: Add JWT config to application.yml**

Add the following at the end of `backend/src/main/resources/application.yml`:

```yaml
  jwt:
    secret: ${JWT_SECRET:dev-secret-key-must-be-at-least-32-characters-long}
    expiry-days: 1
```

The full `app:` block now ends with:

```yaml
app:
  cors:
    allowed-origin: ${CORS_ALLOWED_ORIGIN:http://localhost:3000,http://localhost:3001}
  anthropic:
    api-key: ${ANTHROPIC_API_KEY:}
    model: claude-sonnet-4-6
  market-data:
    polygon-api-key: ${POLYGON_API_KEY:}
    alpha-vantage-api-key: ${ALPHA_VANTAGE_API_KEY:}
  scheduler:
    snapshot-cron: "0 0 0 * * *"
    alert-check-cron: "0 */5 * * * *"
  telegram:
    bot-token: ${TELEGRAM_BOT_TOKEN:}
  jwt:
    secret: ${JWT_SECRET:dev-secret-key-must-be-at-least-32-characters-long}
    expiry-days: 1
```

Also add `JWT_SECRET` to your `.env` file:
```
JWT_SECRET=your-random-secret-at-least-32-chars-here
```

And to Render environment variables in the dashboard.

- [ ] **Step 3: Write failing test for JwtService**

Create `backend/src/test/kotlin/com/investment/application/JwtServiceTest.kt`:

```kotlin
package com.investment.application

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import java.util.UUID

class JwtServiceTest {

    private val service = JwtService(
        secret = "test-secret-key-for-unit-tests-minimum-32-chars",
        expiryDays = 1L
    )

    @Test
    fun `generateToken produces token that validateToken parses back to same userId`() {
        val userId = UUID.randomUUID()
        val token = service.generateToken(userId)
        val parsed = service.validateToken(token)
        assertEquals(userId, parsed)
    }

    @Test
    fun `validateToken returns null for garbage input`() {
        val result = service.validateToken("not-a-jwt")
        assertNull(result)
    }

    @Test
    fun `validateToken returns null for token signed with wrong secret`() {
        val otherService = JwtService("completely-different-secret-also-32-chars-!", 1L)
        val token = otherService.generateToken(UUID.randomUUID())
        val result = service.validateToken(token)
        assertNull(result)
    }
}
```

Run: `cd backend && ./gradlew test --tests "com.investment.application.JwtServiceTest" 2>&1 | tail -20`

Expected: FAIL (class not found)

- [ ] **Step 4: Create UnauthorizedException.kt**

```kotlin
package com.investment.domain

class UnauthorizedException(message: String = "Unauthorized") : RuntimeException(message)
```

- [ ] **Step 5: Create RequestContext.kt**

```kotlin
package com.investment.config

import com.investment.domain.UnauthorizedException
import java.util.UUID

object RequestContext {
    private val userId = ThreadLocal<UUID?>()

    fun set(id: UUID) = userId.set(id)
    fun get(): UUID = userId.get() ?: throw UnauthorizedException()
    fun getOrNull(): UUID? = userId.get()
    fun clear() = userId.remove()
}
```

- [ ] **Step 6: Create JwtService.kt**

```kotlin
package com.investment.application

import io.jsonwebtoken.JwtException
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.util.Date
import java.util.UUID

@Service
class JwtService(
    @Value("\${app.jwt.secret}") private val secret: String,
    @Value("\${app.jwt.expiry-days}") private val expiryDays: Long
) {
    private val key by lazy { Keys.hmacShaKeyFor(secret.toByteArray()) }

    fun generateToken(userId: UUID): String {
        val now = System.currentTimeMillis()
        val expiry = now + expiryDays * 24 * 60 * 60 * 1000
        return Jwts.builder()
            .subject(userId.toString())
            .issuedAt(Date(now))
            .expiration(Date(expiry))
            .signWith(key)
            .compact()
    }

    fun validateToken(token: String): UUID? {
        return try {
            val claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .payload
            UUID.fromString(claims.subject)
        } catch (e: JwtException) {
            null
        } catch (e: IllegalArgumentException) {
            null
        }
    }
}
```

- [ ] **Step 7: Run test — should pass now**

```bash
cd backend && ./gradlew test --tests "com.investment.application.JwtServiceTest" 2>&1 | tail -20
```

Expected: `3 tests completed, 0 failed`

- [ ] **Step 8: Create JwtAuthFilter.kt**

```kotlin
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
```

- [ ] **Step 9: Create FilterConfig.kt**

```kotlin
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
```

- [ ] **Step 10: Add UnauthorizedException handler to GlobalExceptionHandler.kt**

Open `backend/src/main/kotlin/com/investment/api/GlobalExceptionHandler.kt` and add:

```kotlin
package com.investment.api

import com.investment.domain.UnauthorizedException
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class GlobalExceptionHandler {

    private val log = LoggerFactory.getLogger(GlobalExceptionHandler::class.java)

    @ExceptionHandler(UnauthorizedException::class)
    fun handleUnauthorized(ex: UnauthorizedException): ResponseEntity<Map<String, String?>> {
        return ResponseEntity.status(401).body(mapOf("error" to ex.message))
    }

    @ExceptionHandler(IllegalArgumentException::class)
    fun handleIllegalArgument(ex: IllegalArgumentException): ResponseEntity<Map<String, String?>> {
        log.warn("Bad request: ${ex.message}")
        return ResponseEntity.badRequest().body(mapOf("error" to ex.message))
    }

    @ExceptionHandler(NoSuchElementException::class)
    fun handleNotFound(ex: NoSuchElementException): ResponseEntity<Map<String, String?>> {
        log.warn("Not found: ${ex.message}")
        return ResponseEntity.status(404).body(mapOf("error" to ex.message))
    }

    @ExceptionHandler(Exception::class)
    fun handleGeneric(ex: Exception): ResponseEntity<Map<String, String?>> {
        log.error("Unexpected error", ex)
        return ResponseEntity.status(500).body(mapOf("error" to "An unexpected error occurred"))
    }
}
```

- [ ] **Step 11: Compile to verify**

```bash
cd backend && ./gradlew compileKotlin 2>&1 | tail -20
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 12: Commit**

```bash
git add backend/build.gradle.kts backend/src/main/resources/application.yml \
  backend/src/main/kotlin/com/investment/domain/UnauthorizedException.kt \
  backend/src/main/kotlin/com/investment/config/RequestContext.kt \
  backend/src/main/kotlin/com/investment/application/JwtService.kt \
  backend/src/main/kotlin/com/investment/config/JwtAuthFilter.kt \
  backend/src/main/kotlin/com/investment/config/FilterConfig.kt \
  backend/src/main/kotlin/com/investment/api/GlobalExceptionHandler.kt \
  backend/src/test/kotlin/com/investment/application/JwtServiceTest.kt
git commit -m "feat: add JWT filter, RequestContext, and UnauthorizedException"
```

---

## Task 3: Auth Endpoints

**Files:**
- Create: `backend/src/main/kotlin/com/investment/api/dto/AuthRequest.kt`
- Create: `backend/src/main/kotlin/com/investment/api/dto/AuthResponse.kt`
- Create: `backend/src/main/kotlin/com/investment/infrastructure/UserRepository.kt`
- Create: `backend/src/main/kotlin/com/investment/application/UserService.kt`
- Create: `backend/src/main/kotlin/com/investment/api/AuthController.kt`

- [ ] **Step 1: Write failing tests for UserService**

Create `backend/src/test/kotlin/com/investment/application/UserServiceTest.kt`:

```kotlin
package com.investment.application

import com.investment.domain.UnauthorizedException
import com.investment.infrastructure.UserRepository
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import java.util.UUID

class UserServiceTest {

    private val userRepository = mock<UserRepository>()
    private val service = UserService(userRepository)

    @Test
    fun `register creates user and returns userId and username`() {
        val userId = UUID.randomUUID()
        whenever(userRepository.findByUsername("alice")).thenReturn(null)
        whenever(userRepository.insert(any(), any())).thenReturn(userId)

        val result = service.register("alice", "secret123")

        assertEquals("alice", result.username)
        assertEquals(userId, result.userId)
    }

    @Test
    fun `register throws IllegalArgumentException when username already taken`() {
        whenever(userRepository.findByUsername("alice")).thenReturn(
            UserRecord(UUID.randomUUID(), "alice", "hash")
        )

        assertThrows<IllegalArgumentException> {
            service.register("alice", "password")
        }
    }

    @Test
    fun `login returns userId and username for correct credentials`() {
        val userId = UUID.randomUUID()
        val password = "correct-password"
        val hash = org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode(password)
        whenever(userRepository.findByUsername("alice")).thenReturn(
            UserRecord(userId, "alice", hash)
        )

        val result = service.login("alice", password)

        assertEquals(userId, result.userId)
        assertEquals("alice", result.username)
    }

    @Test
    fun `login throws UnauthorizedException for wrong password`() {
        val hash = org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode("real-password")
        whenever(userRepository.findByUsername("alice")).thenReturn(
            UserRecord(UUID.randomUUID(), "alice", hash)
        )

        assertThrows<UnauthorizedException> {
            service.login("alice", "wrong-password")
        }
    }

    @Test
    fun `login throws UnauthorizedException for unknown username`() {
        whenever(userRepository.findByUsername("nobody")).thenReturn(null)

        assertThrows<UnauthorizedException> {
            service.login("nobody", "anything")
        }
    }
}
```

Add mockito-kotlin to `build.gradle.kts` test dependencies:
```kotlin
    testImplementation("org.mockito.kotlin:mockito-kotlin:5.3.1")
```

Run: `cd backend && ./gradlew test --tests "com.investment.application.UserServiceTest" 2>&1 | tail -20`

Expected: FAIL (class not found)

- [ ] **Step 2: Create AuthRequest.kt**

```kotlin
package com.investment.api.dto

data class AuthRequest(
    val username: String,
    val password: String
)
```

- [ ] **Step 3: Create AuthResponse.kt**

```kotlin
package com.investment.api.dto

import java.util.UUID

data class AuthResponse(
    val userId: UUID,
    val username: String
)
```

- [ ] **Step 4: Create UserRepository.kt**

```kotlin
package com.investment.infrastructure

import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.util.UUID

data class UserRecord(
    val id: UUID,
    val username: String,
    val passwordHash: String
)

@Repository
class UserRepository(private val dsl: DSLContext) {

    fun findByUsername(username: String): UserRecord? {
        return dsl.fetchOne(
            "SELECT id, username, password_hash FROM users WHERE username = ?",
            username
        )?.let { r ->
            UserRecord(
                id = UUID.fromString(r.get("id", String::class.java)),
                username = r.get("username", String::class.java),
                passwordHash = r.get("password_hash", String::class.java)
            )
        }
    }

    fun insert(username: String, passwordHash: String): UUID {
        val id = UUID.randomUUID()
        dsl.execute(
            "INSERT INTO users (id, username, password_hash) VALUES (?::uuid, ?, ?)",
            id.toString(), username, passwordHash
        )
        return id
    }

    fun findAllIds(): List<UUID> {
        return dsl.fetch("SELECT id FROM users")
            .map { UUID.fromString(it.get("id", String::class.java)) }
    }

    fun findById(id: UUID): UserRecord? {
        return dsl.fetchOne(
            "SELECT id, username, password_hash FROM users WHERE id = ?::uuid",
            id.toString()
        )?.let { r ->
            UserRecord(
                id = UUID.fromString(r.get("id", String::class.java)),
                username = r.get("username", String::class.java),
                passwordHash = r.get("password_hash", String::class.java)
            )
        }
    }
}
```

- [ ] **Step 5: Create UserService.kt**

```kotlin
package com.investment.application

import com.investment.api.dto.AuthResponse
import com.investment.domain.UnauthorizedException
import com.investment.infrastructure.UserRepository
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class UserService(private val userRepository: UserRepository) {

    private val encoder = BCryptPasswordEncoder()

    fun register(username: String, password: String): AuthResponse {
        require(username.length in 3..50) { "Username must be 3–50 characters" }
        require(password.length >= 8) { "Password must be at least 8 characters" }
        if (userRepository.findByUsername(username) != null) {
            throw IllegalArgumentException("Username '$username' is already taken")
        }
        val hash = encoder.encode(password)
        val userId = userRepository.insert(username, hash)
        return AuthResponse(userId = userId, username = username)
    }

    fun login(username: String, password: String): AuthResponse {
        val user = userRepository.findByUsername(username)
            ?: throw UnauthorizedException("Invalid username or password")
        if (!encoder.matches(password, user.passwordHash)) {
            throw UnauthorizedException("Invalid username or password")
        }
        return AuthResponse(userId = user.id, username = user.username)
    }

    fun findById(userId: UUID): AuthResponse? {
        val user = userRepository.findById(userId) ?: return null
        return AuthResponse(userId = user.id, username = user.username)
    }
}
```

- [ ] **Step 6: Run tests — should pass**

```bash
cd backend && ./gradlew test --tests "com.investment.application.UserServiceTest" 2>&1 | tail -20
```

Expected: `5 tests completed, 0 failed`

- [ ] **Step 7: Create AuthController.kt**

```kotlin
package com.investment.api

import com.investment.api.dto.AuthRequest
import com.investment.api.dto.AuthResponse
import com.investment.application.JwtService
import com.investment.application.UserService
import com.investment.config.RequestContext
import jakarta.servlet.http.Cookie
import jakarta.servlet.http.HttpServletResponse
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
    private val jwtService: JwtService
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
        val cookie = Cookie("auth_token", "")
        cookie.maxAge = 0
        cookie.path = "/"
        cookie.isHttpOnly = true
        cookie.secure = true
        response.addCookie(cookie)
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
        cookie.secure = true
        cookie.path = "/"
        cookie.maxAge = 24 * 60 * 60  // 1 day in seconds
        cookie.setAttribute("SameSite", "None")
        response.addCookie(cookie)
    }
}
```

Note: `SameSite=None` (not `Strict`) is required when the frontend (Vercel) and backend (Render) are on different domains. `Secure=true` is required with `SameSite=None`.

- [ ] **Step 8: Compile to verify**

```bash
cd backend && ./gradlew compileKotlin 2>&1 | tail -20
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 9: Commit**

```bash
git add backend/build.gradle.kts \
  backend/src/main/kotlin/com/investment/api/dto/AuthRequest.kt \
  backend/src/main/kotlin/com/investment/api/dto/AuthResponse.kt \
  backend/src/main/kotlin/com/investment/infrastructure/UserRepository.kt \
  backend/src/main/kotlin/com/investment/application/UserService.kt \
  backend/src/main/kotlin/com/investment/api/AuthController.kt \
  backend/src/test/kotlin/com/investment/application/UserServiceTest.kt
git commit -m "feat: add UserService, UserRepository, and AuthController"
```

---

## Task 4: UserProfile Multi-User

**Files:**
- Modify: `backend/src/main/kotlin/com/investment/infrastructure/UserProfileRepository.kt`
- Modify: `backend/src/main/kotlin/com/investment/application/UserProfileService.kt`

- [ ] **Step 1: Replace UserProfileRepository.kt entirely**

```kotlin
package com.investment.infrastructure

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.investment.api.dto.UserProfileRequest
import com.investment.api.dto.UserProfileResponse
import org.jooq.DSLContext
import org.jooq.Record
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.util.UUID

@Repository
class UserProfileRepository(
    private val dsl: DSLContext,
    private val objectMapper: ObjectMapper
) {

    fun findByUserId(userId: UUID): UserProfileResponse? {
        val record = dsl.fetchOne("SELECT * FROM user_profile WHERE user_id = ?::uuid", userId.toString())
        return record?.toResponse()
    }

    fun upsert(userId: UUID, request: UserProfileRequest, riskLevel: String): UserProfileResponse {
        val id = UUID.randomUUID()
        val tracksJson = objectMapper.writeValueAsString(request.tracksEnabled)
        val answersJson = objectMapper.writeValueAsString(request.questionnaireAnswers)

        val record = dsl.fetchOne(
            """
            INSERT INTO user_profile (
                id, user_id, display_name, preferred_currency, risk_level,
                time_horizon_years, monthly_investment_min, monthly_investment_max,
                investment_goal, tracks_enabled, questionnaire_answers, theme,
                telegram_chat_id, telegram_enabled, timezone, onboarding_completed, created_at, last_updated
            ) VALUES (
                ?::uuid, ?::uuid, ?, ?, ?::risk_level_enum,
                ?, ?, ?,
                ?, ?::jsonb, ?::jsonb, ?,
                ?, ?, ?, false, NOW(), NOW()
            )
            ON CONFLICT (user_id) DO UPDATE SET
                display_name = EXCLUDED.display_name,
                preferred_currency = EXCLUDED.preferred_currency,
                risk_level = EXCLUDED.risk_level,
                time_horizon_years = EXCLUDED.time_horizon_years,
                monthly_investment_min = EXCLUDED.monthly_investment_min,
                monthly_investment_max = EXCLUDED.monthly_investment_max,
                investment_goal = EXCLUDED.investment_goal,
                tracks_enabled = EXCLUDED.tracks_enabled,
                questionnaire_answers = EXCLUDED.questionnaire_answers,
                theme = EXCLUDED.theme,
                telegram_chat_id = EXCLUDED.telegram_chat_id,
                telegram_enabled = EXCLUDED.telegram_enabled,
                timezone = EXCLUDED.timezone,
                last_updated = NOW()
            RETURNING *
            """.trimIndent(),
            id.toString(), userId.toString(),
            request.displayName, request.preferredCurrency, riskLevel,
            request.timeHorizonYears, request.monthlyInvestmentMin, request.monthlyInvestmentMax,
            request.investmentGoal, tracksJson, answersJson, request.theme,
            request.telegramChatId, request.telegramEnabled, request.timezone
        ) ?: throw IllegalStateException("Upsert into user_profile returned no record")

        return record.toResponse()
    }

    fun update(userId: UUID, request: UserProfileRequest, riskLevel: String): UserProfileResponse {
        val tracksJson = objectMapper.writeValueAsString(request.tracksEnabled)
        val answersJson = objectMapper.writeValueAsString(request.questionnaireAnswers)

        val record = dsl.fetchOne(
            """
            UPDATE user_profile SET
                display_name = ?,
                preferred_currency = ?,
                risk_level = ?::risk_level_enum,
                time_horizon_years = ?,
                monthly_investment_min = ?,
                monthly_investment_max = ?,
                investment_goal = ?,
                tracks_enabled = ?::jsonb,
                questionnaire_answers = ?::jsonb,
                theme = ?,
                telegram_chat_id = ?,
                telegram_enabled = ?,
                timezone = ?
            WHERE user_id = ?::uuid
            RETURNING *
            """.trimIndent(),
            request.displayName, request.preferredCurrency, riskLevel,
            request.timeHorizonYears, request.monthlyInvestmentMin, request.monthlyInvestmentMax,
            request.investmentGoal, tracksJson, answersJson, request.theme,
            request.telegramChatId, request.telegramEnabled, request.timezone,
            userId.toString()
        ) ?: throw NoSuchElementException("No user profile found for user $userId")

        return record.toResponse()
    }

    fun setOnboardingCompleted(userId: UUID): UserProfileResponse {
        val record = dsl.fetchOne(
            "UPDATE user_profile SET onboarding_completed = true WHERE user_id = ?::uuid RETURNING *",
            userId.toString()
        ) ?: throw NoSuchElementException("No user profile found for user $userId")
        return record.toResponse()
    }

    fun findTimezone(userId: UUID): String? {
        return dsl.fetchOne(
            "SELECT timezone FROM user_profile WHERE user_id = ?::uuid",
            userId.toString()
        )?.get("timezone", String::class.java)
    }

    fun findProfile(userId: UUID) = findByUserId(userId)

    fun linkTelegramChat(userId: UUID, chatId: String) {
        dsl.execute(
            "UPDATE user_profile SET telegram_chat_id = ?, telegram_enabled = true, last_updated = NOW() WHERE user_id = ?::uuid",
            chatId, userId.toString()
        )
    }

    fun updateRiskScore(userId: UUID, riskLevel: String, aiInferredScore: BigDecimal) {
        dsl.execute(
            "UPDATE user_profile SET risk_level = ?::risk_level_enum, ai_inferred_score = ?, last_updated = NOW() WHERE user_id = ?::uuid",
            riskLevel, aiInferredScore, userId.toString()
        )
    }

    private fun Record.toResponse(): UserProfileResponse {
        val tracksJson = get("tracks_enabled")?.toString() ?: "[]"
        val answersJson = get("questionnaire_answers")?.toString() ?: "{}"
        val tracks: List<String> = objectMapper.readValue(tracksJson)
        val answers: Map<String, Any> = objectMapper.readValue(answersJson)

        return UserProfileResponse(
            id = UUID.fromString(get("id", String::class.java)),
            displayName = get("display_name", String::class.java),
            preferredCurrency = get("preferred_currency", String::class.java),
            riskLevel = get("risk_level", String::class.java),
            timeHorizonYears = get("time_horizon_years", Int::class.java),
            monthlyInvestmentMin = get("monthly_investment_min", BigDecimal::class.java),
            monthlyInvestmentMax = get("monthly_investment_max", BigDecimal::class.java),
            investmentGoal = get("investment_goal", String::class.java),
            tracksEnabled = tracks,
            questionnaireAnswers = answers,
            aiInferredScore = get("ai_inferred_score", BigDecimal::class.java),
            theme = get("theme", String::class.java),
            onboardingCompleted = get("onboarding_completed", Boolean::class.java),
            telegramChatId = get("telegram_chat_id", String::class.java),
            telegramEnabled = get("telegram_enabled", Boolean::class.java) ?: false,
            timezone = get("timezone", String::class.java) ?: "UTC",
            createdAt = get("created_at", java.sql.Timestamp::class.java).toInstant(),
            lastUpdated = get("last_updated", java.sql.Timestamp::class.java).toInstant()
        )
    }
}
```

- [ ] **Step 2: Replace UserProfileService.kt entirely**

```kotlin
package com.investment.application

import com.investment.api.dto.UserProfileRequest
import com.investment.api.dto.UserProfileResponse
import com.investment.config.RequestContext
import com.investment.domain.RiskLevelCalculator
import com.investment.infrastructure.UserProfileRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class UserProfileService(
    private val userProfileRepository: UserProfileRepository
) {

    fun getProfile(): UserProfileResponse? {
        val userId = RequestContext.get()
        return userProfileRepository.findByUserId(userId)
    }

    @Transactional
    fun createProfile(request: UserProfileRequest): UserProfileResponse {
        val userId = RequestContext.get()
        val riskLevel = RiskLevelCalculator.calculate(request.questionnaireAnswers, request.timeHorizonYears)
        return userProfileRepository.upsert(userId, request, riskLevel)
    }

    @Transactional
    fun updateProfile(request: UserProfileRequest): UserProfileResponse {
        val userId = RequestContext.get()
        val riskLevel = RiskLevelCalculator.calculate(request.questionnaireAnswers, request.timeHorizonYears)
        return userProfileRepository.update(userId, request, riskLevel)
    }

    @Transactional
    fun completeOnboarding(): UserProfileResponse {
        val userId = RequestContext.get()
        return userProfileRepository.setOnboardingCompleted(userId)
    }

    @Transactional
    fun linkTelegramChatIfNeeded(userId: UUID, chatId: String) {
        val profile = userProfileRepository.findByUserId(userId) ?: return
        if (profile.telegramChatId == chatId) return
        userProfileRepository.linkTelegramChat(userId, chatId)
    }
}
```

- [ ] **Step 3: Compile**

```bash
cd backend && ./gradlew compileKotlin 2>&1 | tail -20
```

Expected: `BUILD SUCCESSFUL` (or errors pointing to callers of `findOne()` / `findProfile()` which will be fixed in later tasks — these are acceptable for now since the scheduler and telegram services will be updated in Task 7 and 11)

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/kotlin/com/investment/infrastructure/UserProfileRepository.kt \
  backend/src/main/kotlin/com/investment/application/UserProfileService.kt
git commit -m "feat: scope UserProfileRepository and UserProfileService to userId"
```

---

## Task 5: Transactions and Holdings Multi-User

**Files:**
- Modify: `backend/src/main/kotlin/com/investment/infrastructure/TransactionRepository.kt`
- Modify: `backend/src/main/kotlin/com/investment/infrastructure/HoldingsProjectionRepository.kt`
- Modify all services/controllers that call these repos (search the codebase for callers)

- [ ] **Step 1: Update TransactionRepository.kt**

Replace the entire file. Key changes: every method gains `userId: UUID`, SQL gains `WHERE user_id = ?::uuid` for reads, and `user_id` is included in INSERTs:

```kotlin
package com.investment.infrastructure

import com.investment.api.dto.TransactionRequest
import com.investment.api.dto.TransactionResponse
import com.investment.domain.ParsedTransactionRow
import org.jooq.DSLContext
import org.jooq.Record
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.sql.Date
import java.sql.Timestamp
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.UUID

data class TransactionLedgerRow(
    val symbol: String,
    val type: String,
    val track: String,
    val quantity: BigDecimal,
    val pricePerUnit: BigDecimal,
    val executedAt: Instant
)

@Repository
class TransactionRepository(private val dsl: DSLContext) {

    fun findAllOrderedByExecutedAtAsc(userId: UUID): List<TransactionLedgerRow> {
        return dsl.fetch(
            "SELECT symbol, type, track, quantity, price_per_unit, executed_at FROM transactions WHERE user_id = ?::uuid ORDER BY executed_at ASC",
            userId.toString()
        ).map { row ->
            TransactionLedgerRow(
                symbol = row.get("symbol", String::class.java),
                type = row.get("type", String::class.java),
                track = row.get("track", String::class.java),
                quantity = row.get("quantity", BigDecimal::class.java),
                pricePerUnit = row.get("price_per_unit", BigDecimal::class.java),
                executedAt = row.get("executed_at", Timestamp::class.java).toInstant()
            )
        }
    }

    fun findAll(userId: UUID, page: Int, size: Int): List<TransactionResponse> {
        val offset = page * size
        return dsl.fetch(
            "SELECT * FROM transactions WHERE user_id = ?::uuid ORDER BY executed_at DESC LIMIT ? OFFSET ?",
            userId.toString(), size, offset
        ).map { it.toResponse() }
    }

    fun count(userId: UUID): Long {
        return dsl.fetchOne(
            "SELECT COUNT(*) FROM transactions WHERE user_id = ?::uuid",
            userId.toString()
        )?.get(0, Long::class.java) ?: 0L
    }

    fun insert(userId: UUID, request: TransactionRequest): TransactionResponse {
        val id = UUID.randomUUID()
        val record = dsl.fetchOne(
            """
            INSERT INTO transactions (id, user_id, symbol, type, track, quantity, price_per_unit, notes, executed_at, created_at)
            VALUES (?::uuid, ?::uuid, ?, ?::transaction_type_enum, ?::track_enum, ?, ?, ?, ?, NOW())
            RETURNING *
            """.trimIndent(),
            id.toString(), userId.toString(),
            request.symbol.uppercase(), request.type.uppercase(), request.track.uppercase(),
            request.quantity, request.pricePerUnit, request.notes,
            Timestamp.from(request.executedAt)
        ) ?: throw IllegalStateException("Insert into transactions returned no record")
        return record.toResponse()
    }

    fun insertImport(userId: UUID, rows: List<ParsedTransactionRow>): Int {
        var inserted = 0
        for (row in rows) {
            val id = UUID.randomUUID()
            val executedAt = LocalDate.parse(row.transactionDate).atStartOfDay(ZoneOffset.UTC).toInstant()
            dsl.execute(
                """
                INSERT INTO transactions (id, user_id, symbol, type, track, quantity, price_per_unit, notes, executed_at, created_at, source)
                VALUES (?::uuid, ?::uuid, ?, ?::transaction_type_enum, ?::track_enum, ?, ?, ?, ?, NOW(), 'IMPORT')
                """.trimIndent(),
                id.toString(), userId.toString(),
                row.symbol.uppercase(), row.transactionType.uppercase(), row.track.uppercase(),
                BigDecimal(row.quantity), BigDecimal(row.pricePerUnit),
                row.notes, Timestamp.from(executedAt)
            )
            inserted++
        }
        return inserted
    }

    fun countByType(userId: UUID): Map<String, Int> {
        return dsl.fetch(
            "SELECT type, COUNT(*) AS cnt FROM transactions WHERE user_id = ?::uuid GROUP BY type",
            userId.toString()
        ).associate { r -> r.get("type", String::class.java) to r.get("cnt", Long::class.java).toInt() }
    }

    fun findEarliestTransactionDate(userId: UUID): LocalDate? {
        val record = dsl.fetchOne(
            "SELECT MIN(executed_at::date) AS earliest_date FROM transactions WHERE user_id = ?::uuid",
            userId.toString()
        )
        return record?.get("earliest_date", Date::class.java)?.toLocalDate()
    }

    fun findExecutedAtById(userId: UUID, id: UUID): Instant? {
        return dsl.fetchOne(
            "SELECT executed_at FROM transactions WHERE id = ?::uuid AND user_id = ?::uuid",
            id.toString(), userId.toString()
        )?.get("executed_at", Timestamp::class.java)?.toInstant()
    }

    fun update(userId: UUID, id: UUID, request: TransactionRequest): TransactionResponse {
        val record = dsl.fetchOne(
            """
            UPDATE transactions SET
                symbol = ?, type = ?::transaction_type_enum, track = ?::track_enum,
                quantity = ?, price_per_unit = ?, notes = ?, executed_at = ?
            WHERE id = ?::uuid AND user_id = ?::uuid
            RETURNING *
            """.trimIndent(),
            request.symbol.uppercase(), request.type.uppercase(), request.track.uppercase(),
            request.quantity, request.pricePerUnit, request.notes,
            Timestamp.from(request.executedAt),
            id.toString(), userId.toString()
        ) ?: throw NoSuchElementException("Transaction $id not found")
        return record.toResponse()
    }

    fun delete(userId: UUID, id: UUID) {
        val deleted = dsl.execute(
            "DELETE FROM transactions WHERE id = ?::uuid AND user_id = ?::uuid",
            id.toString(), userId.toString()
        )
        if (deleted == 0) throw NoSuchElementException("Transaction $id not found")
    }

    private fun Record.toResponse(): TransactionResponse {
        return TransactionResponse(
            id = UUID.fromString(get("id", String::class.java)),
            symbol = get("symbol", String::class.java),
            type = get("type", String::class.java),
            track = get("track", String::class.java),
            quantity = get("quantity", BigDecimal::class.java),
            pricePerUnit = get("price_per_unit", BigDecimal::class.java),
            totalValue = get("total_value", BigDecimal::class.java),
            notes = get("notes", String::class.java),
            executedAt = get("executed_at", Timestamp::class.java).toInstant(),
            createdAt = get("created_at", Timestamp::class.java).toInstant()
        )
    }
}
```

- [ ] **Step 2: Update HoldingsProjectionRepository.kt**

The `current_holdings` view now includes `user_id`, so queries filter on it:

```kotlin
package com.investment.infrastructure

import com.investment.api.dto.HoldingResponse
import org.jooq.DSLContext
import org.jooq.Record
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.sql.Timestamp
import java.util.UUID

@Repository
class HoldingsProjectionRepository(private val dsl: DSLContext) {

    fun findAll(userId: UUID): List<HoldingResponse> {
        return dsl.fetch(
            "SELECT * FROM current_holdings WHERE user_id = ?::uuid ORDER BY symbol, track",
            userId.toString()
        ).map { it.toResponse() }
    }

    fun findBySymbolAndTrack(userId: UUID, symbol: String, track: String): BigDecimal {
        val record = dsl.fetchOne(
            "SELECT net_quantity FROM current_holdings WHERE user_id = ?::uuid AND UPPER(symbol) = UPPER(?) AND track = ?::track_enum",
            userId.toString(), symbol, track.uppercase()
        )
        return record?.get("net_quantity", BigDecimal::class.java) ?: BigDecimal.ZERO
    }

    private fun Record.toResponse(): HoldingResponse {
        return HoldingResponse(
            symbol = get("symbol", String::class.java),
            track = get("track", String::class.java),
            netQuantity = get("net_quantity", BigDecimal::class.java),
            avgBuyPrice = get("avg_buy_price", BigDecimal::class.java) ?: BigDecimal.ZERO,
            totalCostBasis = get("total_cost_basis", BigDecimal::class.java) ?: BigDecimal.ZERO,
            transactionCount = get("transaction_count", Long::class.java).toInt(),
            firstBoughtAt = get("first_bought_at", Timestamp::class.java).toInstant(),
            lastTransactionAt = get("last_transaction_at", Timestamp::class.java).toInstant()
        )
    }
}
```

- [ ] **Step 3: Update all callers — find them**

```bash
cd backend && grep -rn "transactionRepository\.\|holdingsRepository\." src/main/kotlin --include="*.kt" | grep -v "Repository.kt" | grep -v "Test.kt"
```

This will list every service/controller that calls these repositories. For each result, add `userId` by calling `RequestContext.get()` at the top of the method.

The services that will need updating (based on known code) are:
- `TransactionService` (if it exists) or the `TransactionController` directly
- `HoldingsController`
- `PortfolioSummaryService`
- `SnapshotService` (handled in Task 7)
- `ImportService`
- `SellRecalculationService` (if it exists)
- `SharedContextBuilder`
- `TelegramContextBuilder`

For **each caller found**, the pattern is:

```kotlin
// Before
fun getAll(): List<TransactionResponse> {
    return transactionRepository.findAll(0, 50)
}

// After
fun getAll(): List<TransactionResponse> {
    val userId = RequestContext.get()
    return transactionRepository.findAll(userId, 0, 50)
}
```

Go through every caller identified by the grep command above and apply this pattern.

- [ ] **Step 4: Compile to verify all callers are updated**

```bash
cd backend && ./gradlew compileKotlin 2>&1 | tail -30
```

Expected: `BUILD SUCCESSFUL`. Fix any remaining compile errors before continuing.

- [ ] **Step 5: Commit**

```bash
git add -u
git commit -m "feat: scope transactions and holdings repositories to userId"
```

---

## Task 6: Allocations Multi-User

**Files:**
- Modify: `backend/src/main/kotlin/com/investment/infrastructure/AllocationRepository.kt`
- Modify: `backend/src/main/kotlin/com/investment/application/AllocationService.kt`

- [ ] **Step 1: Update AllocationRepository.kt**

Key changes: all methods gain `userId`, `ON CONFLICT (UPPER(symbol))` becomes `ON CONFLICT (user_id, UPPER(symbol))`:

```kotlin
package com.investment.infrastructure

import com.investment.api.dto.TargetAllocationRequest
import com.investment.api.dto.TargetAllocationResponse
import org.jooq.DSLContext
import org.jooq.Record
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

@Repository
class AllocationRepository(private val dsl: DSLContext) {

    fun findAll(userId: UUID): List<TargetAllocationResponse> {
        val allRows = dsl.fetch(
            "SELECT * FROM target_allocations WHERE user_id = ?::uuid ORDER BY display_order, created_at",
            userId.toString()
        )
        val parentIds = allRows.mapNotNull { it.get("parent_id", String::class.java) }.map { it.uppercase() }.toSet()
        val idsWithChildren = allRows.map { it.get("id", String::class.java).uppercase() }.filter { it in parentIds }.toSet()
        return allRows.map { it.toResponse(idsWithChildren) }
    }

    fun insert(userId: UUID, request: TargetAllocationRequest): TargetAllocationResponse {
        val id = UUID.randomUUID()
        val record = dsl.fetchOne(
            """
            INSERT INTO target_allocations (id, user_id, symbol, asset_type, target_percentage, label, display_order, parent_id, sector, created_at, updated_at)
            VALUES (?::uuid, ?::uuid, ?, ?::asset_type_enum, ?, ?, ?, ?::uuid, ?, NOW(), NOW())
            ON CONFLICT (user_id, UPPER(symbol)) DO UPDATE SET
                asset_type = EXCLUDED.asset_type,
                target_percentage = EXCLUDED.target_percentage,
                label = EXCLUDED.label,
                display_order = EXCLUDED.display_order,
                parent_id = EXCLUDED.parent_id,
                sector = EXCLUDED.sector,
                updated_at = NOW()
            RETURNING *
            """.trimIndent(),
            id.toString(), userId.toString(),
            request.symbol.uppercase(), request.assetType.uppercase(),
            request.targetPercentage, request.label, request.displayOrder,
            request.parentId, request.sector
        ) ?: throw IllegalStateException("Upsert into target_allocations returned no record")
        return record.toResponse(emptySet())
    }

    fun update(userId: UUID, id: UUID, request: TargetAllocationRequest): TargetAllocationResponse {
        val record = dsl.fetchOne(
            """
            UPDATE target_allocations SET
                symbol = ?, asset_type = ?::asset_type_enum, target_percentage = ?,
                label = ?, display_order = ?, parent_id = ?::uuid, sector = ?, updated_at = NOW()
            WHERE id = ?::uuid AND user_id = ?::uuid
            RETURNING *
            """.trimIndent(),
            request.symbol.uppercase(), request.assetType.uppercase(),
            request.targetPercentage, request.label, request.displayOrder,
            request.parentId, request.sector,
            id.toString(), userId.toString()
        ) ?: throw NoSuchElementException("Allocation $id not found")
        return record.toResponse(emptySet())
    }

    fun delete(userId: UUID, id: UUID) {
        val deleted = dsl.execute(
            "DELETE FROM target_allocations WHERE id = ?::uuid AND user_id = ?::uuid",
            id.toString(), userId.toString()
        )
        if (deleted == 0) throw NoSuchElementException("Allocation $id not found")
    }

    @Transactional
    fun replaceAll(userId: UUID, requests: List<TargetAllocationRequest>): List<TargetAllocationResponse> {
        dsl.execute("DELETE FROM target_allocations WHERE user_id = ?::uuid", userId.toString())
        return requests.map { insert(userId, it) }
    }

    private fun Record.toResponse(idsWithChildren: Set<String>): TargetAllocationResponse {
        val idStr = get("id", String::class.java)
        return TargetAllocationResponse(
            id = UUID.fromString(idStr),
            symbol = get("symbol", String::class.java),
            assetType = get("asset_type", String::class.java),
            targetPercentage = get("target_percentage", BigDecimal::class.java),
            label = get("label", String::class.java),
            displayOrder = get("display_order", Int::class.java),
            parentId = get("parent_id", String::class.java)?.let { UUID.fromString(it) },
            sector = get("sector", String::class.java),
            isCategory = idStr.uppercase() in idsWithChildren,
            createdAt = get("created_at", java.sql.Timestamp::class.java).toInstant(),
            updatedAt = get("updated_at", java.sql.Timestamp::class.java).toInstant()
        )
    }
}
```

- [ ] **Step 2: Update AllocationService.kt — add RequestContext.get() to every method**

```kotlin
package com.investment.application

import com.investment.api.dto.TargetAllocationRequest
import com.investment.api.dto.TargetAllocationResponse
import com.investment.config.RequestContext
import com.investment.infrastructure.AllocationRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class AllocationService(private val allocationRepository: AllocationRepository) {

    fun getAllocations(): List<TargetAllocationResponse> {
        val userId = RequestContext.get()
        return allocationRepository.findAll(userId)
    }

    @Transactional
    fun addAllocation(request: TargetAllocationRequest): TargetAllocationResponse {
        val userId = RequestContext.get()
        return allocationRepository.insert(userId, request)
    }

    @Transactional
    fun updateAllocation(id: UUID, request: TargetAllocationRequest): TargetAllocationResponse {
        val userId = RequestContext.get()
        return allocationRepository.update(userId, id, request)
    }

    @Transactional
    fun deleteAllocation(id: UUID) {
        val userId = RequestContext.get()
        allocationRepository.delete(userId, id)
    }

    @Transactional
    fun replaceAllAllocations(requests: List<TargetAllocationRequest>): List<TargetAllocationResponse> {
        val userId = RequestContext.get()
        return allocationRepository.replaceAll(userId, requests)
    }
}
```

- [ ] **Step 3: Update all other callers of allocationRepository (e.g. SnapshotService)**

```bash
cd backend && grep -rn "allocationRepository\." src/main/kotlin --include="*.kt" | grep -v "AllocationRepository.kt" | grep -v "AllocationService.kt"
```

For `SnapshotService.createSnapshotWithPrices()` which calls `allocationRepository.findAll()`:
The snapshot service methods will gain a `userId` parameter in Task 7, so pass it through.

- [ ] **Step 4: Compile**

```bash
cd backend && ./gradlew compileKotlin 2>&1 | tail -20
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 5: Commit**

```bash
git add -u
git commit -m "feat: scope AllocationRepository and AllocationService to userId"
```

---

## Task 7: Snapshots and Schedulers Multi-User

**Files:**
- Modify: `backend/src/main/kotlin/com/investment/infrastructure/SnapshotRepository.kt`
- Modify: `backend/src/main/kotlin/com/investment/application/SnapshotService.kt`
- Modify: `backend/src/main/kotlin/com/investment/application/CatchUpService.kt`
- Modify: `backend/src/main/kotlin/com/investment/infrastructure/DailySnapshotScheduler.kt`

Note: `SnapshotService` methods receive `userId` as a **parameter** (not from `RequestContext`) because they are called both from HTTP handlers and from background schedulers.

- [ ] **Step 1: Update SnapshotRepository.kt**

```kotlin
package com.investment.infrastructure

import org.jooq.DSLContext
import org.jooq.Record
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.sql.Date
import java.time.LocalDate
import java.util.UUID

data class SnapshotRecord(
    val date: LocalDate,
    val totalValue: BigDecimal,
    val dailyPnl: BigDecimal,
    val snapshotSource: String
)

@Repository
class SnapshotRepository(private val dsl: DSLContext) {

    fun existsForDate(userId: UUID, date: LocalDate): Boolean {
        val count = dsl.fetchOne(
            "SELECT COUNT(*) FROM portfolio_snapshots WHERE user_id = ?::uuid AND date = ?",
            userId.toString(), Date.valueOf(date)
        )?.get(0, Long::class.java) ?: 0L
        return count > 0
    }

    fun save(userId: UUID, date: LocalDate, totalValue: BigDecimal, dailyPnl: BigDecimal, source: String) {
        dsl.execute(
            """
            INSERT INTO portfolio_snapshots (id, user_id, date, total_value, daily_pnl, snapshot_source, created_at)
            VALUES (gen_random_uuid(), ?::uuid, ?, ?, ?, ?::snapshot_source_enum, NOW())
            """.trimIndent(),
            userId.toString(), Date.valueOf(date), totalValue, dailyPnl, source
        )
    }

    fun deleteByDateRange(userId: UUID, from: LocalDate, to: LocalDate): Int {
        return dsl.execute(
            "DELETE FROM portfolio_snapshots WHERE user_id = ?::uuid AND date >= ? AND date <= ?",
            userId.toString(), Date.valueOf(from), Date.valueOf(to)
        )
    }

    fun findByDate(userId: UUID, date: LocalDate): SnapshotRecord? {
        return dsl.fetchOne(
            "SELECT date, total_value, daily_pnl, snapshot_source FROM portfolio_snapshots WHERE user_id = ?::uuid AND date = ?",
            userId.toString(), Date.valueOf(date)
        )?.toSnapshotRecord()
    }

    fun findAllOrderedByDateAsc(userId: UUID): List<SnapshotRecord> {
        return dsl.fetch(
            "SELECT date, total_value, daily_pnl, snapshot_source FROM portfolio_snapshots WHERE user_id = ?::uuid ORDER BY date ASC",
            userId.toString()
        ).map { it.toSnapshotRecord() }
    }

    fun findRecentN(userId: UUID, n: Int): List<SnapshotRecord> {
        return dsl.fetch(
            "SELECT date, total_value, daily_pnl, snapshot_source FROM portfolio_snapshots WHERE user_id = ?::uuid ORDER BY date DESC LIMIT ?",
            userId.toString(), n
        ).map { it.toSnapshotRecord() }
    }

    private fun Record.toSnapshotRecord() = SnapshotRecord(
        date = get("date", Date::class.java).toLocalDate(),
        totalValue = get("total_value", BigDecimal::class.java),
        dailyPnl = get("daily_pnl", BigDecimal::class.java),
        snapshotSource = get("snapshot_source", String::class.java)
    )
}
```

- [ ] **Step 2: Update SnapshotService.kt — add userId parameter to all public methods**

The three private helpers (`computeHoldingsAsOf`, `createSnapshotWithPrices`, `HoldingState.toHoldingResponse`) stay the same. Only the public methods and their calls to repositories change:

For `createSnapshotWithPrices` (private), add `userId: UUID` as first parameter and pass it to `snapshotRepository.existsForDate(userId, date)`, `snapshotRepository.save(userId, ...)`, and `allocationRepository.findAll(userId)`.

For `createSnapshotForDate`, change signature to `fun createSnapshotForDate(userId: UUID, date: LocalDate, source: String)` and pass `userId` to `holdingsRepository.findAll(userId)` and `createSnapshotWithPrices(userId, ...)`.

For `regenerateSnapshotsFrom`, change signature to `fun regenerateSnapshotsFrom(userId: UUID, fromDate: LocalDate)` and pass `userId` to `snapshotRepository.deleteByDateRange(userId, ...)`, `transactionRepository.findAllOrderedByExecutedAtAsc(userId)`, `snapshotRepository.existsForDate(userId, ...)`, and `snapshotRepository.save(userId, ...)`.

Make these targeted changes throughout `SnapshotService.kt` — do not restructure the logic, only add the `userId` parameter thread.

- [ ] **Step 3: Update CatchUpService.kt**

```kotlin
package com.investment.application

import com.investment.infrastructure.SnapshotRepository
import com.investment.infrastructure.TransactionRepository
import com.investment.infrastructure.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.time.LocalDate
import java.util.UUID

@Service
class CatchUpService(
    private val transactionRepository: TransactionRepository,
    private val snapshotRepository: SnapshotRepository,
    private val snapshotService: SnapshotService,
    private val userRepository: UserRepository
) {

    private val log = LoggerFactory.getLogger(javaClass)

    fun runCatchUp() {
        val allUserIds = userRepository.findAllIds()
        if (allUserIds.isEmpty()) {
            log.debug("No users registered — skipping catch-up")
            return
        }
        for (userId in allUserIds) {
            runCatchUpForUser(userId)
        }
    }

    private fun runCatchUpForUser(userId: UUID) {
        val earliest = transactionRepository.findEarliestTransactionDate(userId)
        if (earliest == null) {
            log.debug("No transactions for user {} — skipping catch-up", userId)
            return
        }

        val yesterday = LocalDate.now().minusDays(1)
        if (earliest.isAfter(yesterday)) {
            log.debug("Earliest transaction for user {} is not before yesterday — nothing to catch up", userId)
            return
        }

        val missingDates = generateSequence(earliest) { it.plusDays(1) }
            .takeWhile { !it.isAfter(yesterday) }
            .filter { !snapshotRepository.existsForDate(userId, it) }
            .toList()

        if (missingDates.isEmpty()) {
            log.debug("No missing snapshots for user {} in catch-up range", userId)
            return
        }

        log.info("Catch-up for user {}: {} missing snapshot(s) from {} to {}",
            userId, missingDates.size, missingDates.first(), missingDates.last())

        for (date in missingDates) {
            snapshotService.createSnapshotForDate(userId, date, "CATCHUP")
        }

        log.info("Catch-up for user {} complete", userId)
    }
}
```

- [ ] **Step 4: Update DailySnapshotScheduler.kt to iterate all users**

Open `backend/src/main/kotlin/com/investment/infrastructure/DailySnapshotScheduler.kt` and inject `UserRepository`. In the scheduled method, loop over all user IDs and call `snapshotService.createSnapshotForDate(userId, today, "SCHEDULED")` for each.

Pattern:

```kotlin
@Scheduled(cron = "\${app.scheduler.snapshot-cron}")
fun runDailySnapshot() {
    val today = LocalDate.now(clock)
    val allUserIds = userRepository.findAllIds()
    for (userId in allUserIds) {
        try {
            snapshotService.createSnapshotForDate(userId, today, "SCHEDULED")
        } catch (e: Exception) {
            log.error("Snapshot failed for user {}: {}", userId, e.message)
        }
    }
}
```

- [ ] **Step 5: Find and fix HTTP callers of SnapshotService**

```bash
cd backend && grep -rn "snapshotService\." src/main/kotlin --include="*.kt" | grep -v "SnapshotService.kt" | grep -v "Scheduler\|CatchUp"
```

For any HTTP-layer callers (controllers or services called from controllers), add `val userId = RequestContext.get()` and pass it to `snapshotService.createSnapshotForDate(userId, ...)` or `snapshotService.regenerateSnapshotsFrom(userId, ...)`.

- [ ] **Step 6: Compile**

```bash
cd backend && ./gradlew compileKotlin 2>&1 | tail -20
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 7: Commit**

```bash
git add -u
git commit -m "feat: scope SnapshotRepository and SnapshotService to userId; schedulers iterate all users"
```

---

## Task 8: Watchlist and Alerts Multi-User

**Files:**
- Modify: `backend/src/main/kotlin/com/investment/infrastructure/WatchlistRepository.kt`
- Modify: `backend/src/main/kotlin/com/investment/infrastructure/AlertRepository.kt`
- Modify their services and controllers

- [ ] **Step 1: Update WatchlistRepository.kt**

Add `userId: UUID` to every method. For `findActive()` used by the alert scheduler, it already queries `alerts`, not watchlist — but add `userId` to all watchlist methods:

```kotlin
fun findAll(userId: UUID): List<WatchlistItemResponse> {
    return dsl.fetch("SELECT * FROM watchlist WHERE user_id = ?::uuid ORDER BY added_at DESC", userId.toString())
        .map { it.toResponse() }
}

fun findById(userId: UUID, id: UUID): WatchlistItemResponse? {
    return dsl.fetchOne(
        "SELECT * FROM watchlist WHERE id = ?::uuid AND user_id = ?::uuid",
        id.toString(), userId.toString()
    )?.toResponse()
}

fun insert(userId: UUID, symbol: String, assetType: String): WatchlistItemResponse {
    val record = dsl.fetchOne(
        """
        INSERT INTO watchlist (user_id, symbol, asset_type)
        VALUES (?::uuid, ?, ?::asset_type_enum)
        RETURNING *
        """.trimIndent(),
        userId.toString(), symbol.uppercase(), assetType.uppercase()
    ) ?: throw IllegalStateException("Insert into watchlist returned no record")
    return record.toResponse()
}

fun delete(userId: UUID, id: UUID) {
    val deleted = dsl.execute(
        "DELETE FROM watchlist WHERE id = ?::uuid AND user_id = ?::uuid",
        id.toString(), userId.toString()
    )
    if (deleted == 0) throw NoSuchElementException("No watchlist item found with id $id")
}

fun saveAnalysis(userId: UUID, id: UUID, signal: String, signalSummary: String, fullAnalysis: String): WatchlistItemResponse {
    // add AND user_id = ?::uuid to WHERE clause
}
```

Apply the same pattern to every remaining method in `WatchlistRepository.kt`.

- [ ] **Step 2: Update AlertRepository.kt**

- User-facing methods (`findAll`, `insert`, `delete`, `trigger`, `dismiss`, `reEnable`) gain `userId: UUID`
- `findActive()` stays without userId — it is called by the alert scheduler which needs ALL active alerts across ALL users. Add `user_id` to the `AlertResponse` DTO so the scheduler knows which user to notify.

```kotlin
// User-facing
fun findAll(userId: UUID): List<AlertResponse> {
    return dsl.fetch("SELECT * FROM alerts WHERE user_id = ?::uuid ORDER BY created_at DESC", userId.toString())
        .map { it.toResponse() }
}

fun insert(userId: UUID, symbol: String, condition: String, thresholdPrice: BigDecimal, note: String?, source: String = "APP"): AlertResponse {
    val record = dsl.fetchOne(
        """
        INSERT INTO alerts (user_id, symbol, condition, threshold_price, note, source)
        VALUES (?::uuid, ?, ?::alert_condition_enum, ?, ?, ?)
        RETURNING *
        """.trimIndent(),
        userId.toString(), symbol.uppercase(), condition.uppercase(), thresholdPrice, note, source.uppercase()
    ) ?: throw IllegalStateException("Insert into alerts returned no record")
    return record.toResponse()
}

fun delete(userId: UUID, id: UUID) {
    val deleted = dsl.execute(
        "DELETE FROM alerts WHERE id = ?::uuid AND user_id = ?::uuid",
        id.toString(), userId.toString()
    )
    if (deleted == 0) throw NoSuchElementException("No alert found with id $id")
}

// Scheduler-facing — stays without userId but returns alerts with user_id in the response
fun findActive(): List<AlertResponse> {
    return dsl.fetch("SELECT * FROM alerts WHERE is_active = TRUE ORDER BY created_at DESC")
        .map { it.toResponse() }
}
```

Also add `userId: UUID` to `AlertResponse` DTO so the scheduler can use it for Telegram notification routing.

- [ ] **Step 3: Update all callers of WatchlistRepository and AlertRepository**

```bash
cd backend && grep -rn "watchlistRepository\.\|alertRepository\." src/main/kotlin --include="*.kt" | grep -v "Repository.kt"
```

For each caller, add `val userId = RequestContext.get()` (HTTP layer) or iterate users (scheduler layer) and pass it down.

- [ ] **Step 4: Compile**

```bash
cd backend && ./gradlew compileKotlin 2>&1 | tail -20
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 5: Commit**

```bash
git add -u
git commit -m "feat: scope WatchlistRepository and AlertRepository to userId"
```

---

## Task 9: Options Multi-User

**Files:**
- Modify: `backend/src/main/kotlin/com/investment/infrastructure/OptionsTransactionRepository.kt`
- Modify: `backend/src/main/kotlin/com/investment/application/OptionsTransactionService.kt`

- [ ] **Step 1: Update OptionsTransactionRepository.kt**

Add `userId: UUID` to all methods. Apply the same pattern used in Tasks 5–8: reads get `WHERE user_id = ?::uuid`, inserts include `user_id` as the second value. The `active_options` view already includes `user_id`, so queries on it filter by `WHERE user_id = ?::uuid`.

Example for the insert method:
```kotlin
fun insert(userId: UUID, request: OptionsTransactionRequest): OptionsTransactionResponse {
    val id = UUID.randomUUID()
    val record = dsl.fetchOne(
        """
        INSERT INTO options_transactions (id, user_id, underlying_symbol, option_type, action,
            strike_price, expiration_date, contracts, premium_per_contract, status, notes, executed_at, created_at)
        VALUES (?::uuid, ?::uuid, ?, ?::option_type_enum, ?::option_action_enum,
            ?, ?, ?, ?, ?::option_status_enum, ?, ?, NOW())
        RETURNING *
        """.trimIndent(),
        id.toString(), userId.toString(),
        request.underlyingSymbol.uppercase(), request.optionType.uppercase(), request.action.uppercase(),
        request.strikePrice, request.expirationDate, request.contracts, request.premiumPerContract,
        "ACTIVE", request.notes, request.executedAt?.let { java.sql.Timestamp.from(it) }
    ) ?: throw IllegalStateException("Insert into options_transactions returned no record")
    return record.toResponse()
}
```

Apply the same `userId` addition to every other method (`findAll`, `findById`, `update`, `delete`, `updateStatus`). For queries against the `active_options` view, add `WHERE user_id = ?::uuid`.

- [ ] **Step 2: Update OptionsTransactionService.kt**

Add `val userId = RequestContext.get()` at the top of each public method and pass it to the repository.

- [ ] **Step 3: Compile**

```bash
cd backend && ./gradlew compileKotlin 2>&1 | tail -20
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 4: Commit**

```bash
git add -u
git commit -m "feat: scope OptionsTransactionRepository to userId"
```

---

## Task 10: Risk Score History, Recommendations, and Monthly Sessions Multi-User

**Files:**
- Modify: `backend/src/main/kotlin/com/investment/infrastructure/RiskScoreHistoryRepository.kt`
- Modify: `backend/src/main/kotlin/com/investment/infrastructure/RecommendationCacheRepository.kt`
- Modify: `backend/src/main/kotlin/com/investment/infrastructure/MonthlyInvestmentSessionRepository.kt`
- Modify their services

- [ ] **Step 1: Update RiskScoreHistoryRepository.kt**

Change `insert(...)` to `insert(userId: UUID, ...)` adding `user_id` to the INSERT.
Change `findAllNewestFirst()` to `findAllNewestFirst(userId: UUID)` adding `WHERE user_id = ?::uuid`.

```kotlin
fun insert(userId: UUID, riskLevel: String, aiInferredScore: BigDecimal, reasoning: String, trigger: String, transactionCountAtUpdate: Int): RiskHistoryEntryResponse {
    val record = dsl.fetchOne(
        """
        INSERT INTO risk_score_history (user_id, risk_level, ai_inferred_score, reasoning, trigger, transaction_count_at_update)
        VALUES (?::uuid, ?::risk_level_enum, ?, ?, ?::risk_score_trigger_enum, ?)
        RETURNING *
        """.trimIndent(),
        userId.toString(), riskLevel, aiInferredScore, reasoning, trigger, transactionCountAtUpdate
    ) ?: throw IllegalStateException("Insert into risk_score_history returned no record")
    return record.toRiskHistoryResponse()
}

fun findAllNewestFirst(userId: UUID): List<RiskHistoryEntryResponse> {
    return dsl.fetch(
        "SELECT * FROM risk_score_history WHERE user_id = ?::uuid ORDER BY created_at DESC",
        userId.toString()
    ).map { it.toRiskHistoryResponse() }
}

private fun Record.toRiskHistoryResponse() = RiskHistoryEntryResponse(
    id = UUID.fromString(get("id", String::class.java)),
    riskLevel = get("risk_level", String::class.java),
    aiInferredScore = get("ai_inferred_score", BigDecimal::class.java),
    reasoning = get("reasoning", String::class.java),
    trigger = get("trigger", String::class.java),
    transactionCountAtUpdate = get("transaction_count_at_update", Int::class.java),
    createdAt = get("created_at", Timestamp::class.java).toInstant()
)
```

- [ ] **Step 2: Update RiskProfileService.kt**

Add `val userId = RequestContext.get()` at the top of each public method. Pass `userId` to `riskScoreHistoryRepository.insert(userId, ...)`, `riskScoreHistoryRepository.findAllNewestFirst(userId)`, `userProfileRepository.updateRiskScore(userId, ...)`, etc.

Also update the `UserProfileRepository.updateRiskScore(userId, ...)` call — it already takes `userId` after Task 4.

- [ ] **Step 3: Update RecommendationCacheRepository.kt**

Add `userId` to all methods. The cache table has a `UNIQUE INDEX idx_ai_cache_user ON ai_recommendation_cache (user_id)` (set in V15). Use `ON CONFLICT (user_id) DO UPDATE` for upserts:

```kotlin
fun findValid(userId: UUID): ...  // add WHERE user_id = ?::uuid
fun save(userId: UUID, ...): ... // add user_id to INSERT, use ON CONFLICT (user_id) DO UPDATE
fun invalidate(userId: UUID): ... // add WHERE user_id = ?::uuid
```

- [ ] **Step 4: Update MonthlyInvestmentSessionRepository.kt**

Add `userId` to all methods. For inserts, include `user_id`. For reads, add `WHERE user_id = ?::uuid`.

- [ ] **Step 5: Update all callers**

```bash
cd backend && grep -rn "riskScoreHistoryRepository\.\|recommendationCacheRepository\.\|monthlyInvestmentSessionRepository\." src/main/kotlin --include="*.kt" | grep -v "Repository.kt"
```

For each caller, add `val userId = RequestContext.get()` and pass it down.

- [ ] **Step 6: Compile**

```bash
cd backend && ./gradlew compileKotlin 2>&1 | tail -20
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 7: Commit**

```bash
git add -u
git commit -m "feat: scope RiskScoreHistoryRepository, RecommendationCacheRepository, and MonthlySessionRepository to userId"
```

---

## Task 11: Telegram Multi-User

**Files:**
- Modify: `backend/src/main/kotlin/com/investment/infrastructure/TelegramConversationRepository.kt`
- Modify: `backend/src/main/kotlin/com/investment/infrastructure/TelegramScheduledMessageRepository.kt`
- Modify: `backend/src/main/kotlin/com/investment/infrastructure/TelegramPendingConfirmationRepository.kt`
- Modify their services

- [ ] **Step 1: Find all methods that need userId**

```bash
cd backend && grep -n "fun " \
  src/main/kotlin/com/investment/infrastructure/TelegramConversationRepository.kt \
  src/main/kotlin/com/investment/infrastructure/TelegramScheduledMessageRepository.kt \
  src/main/kotlin/com/investment/infrastructure/TelegramPendingConfirmationRepository.kt
```

- [ ] **Step 2: Update all three Telegram repositories**

For each method that reads or writes user-specific data:
- Add `userId: UUID` parameter
- Add `WHERE user_id = ?::uuid` to reads
- Add `user_id` to inserts

The `TelegramScheduledMessageRepository` methods for managing schedules all gain `userId`. The `TelegramConversationRepository` methods for looking up conversations by session gain `userId` where applicable. The `TelegramPendingConfirmationRepository` gains `userId` for all writes.

Note: Telegram webhook-triggered operations (inbound messages from Telegram) identify the user by looking up their `telegram_chat_id` in `user_profile`. The webhook handler should do `userProfileRepository.findByTelegramChatId(chatId)` to get the `userId`, then pass it to all downstream operations. Add this lookup method to `UserProfileRepository`:

```kotlin
fun findByTelegramChatId(chatId: String): UserProfileResponse? {
    return dsl.fetchOne(
        "SELECT * FROM user_profile WHERE telegram_chat_id = ?",
        chatId
    )?.toResponse()
}
```

- [ ] **Step 3: Update TelegramScheduledMessageJob and TelegramWebhookController**

For `TelegramScheduledMessageJob`: this job already reads scheduled messages which now have `user_id` — use the `user_id` from the message record to look up the user's Telegram chat ID.

For `TelegramWebhookController`: extract the chat ID from the incoming webhook, look up the user, and pass the `userId` to all Telegram services.

- [ ] **Step 4: Update TelegramScheduledMessageService callers**

```bash
cd backend && grep -rn "telegramScheduledMessage\|telegramConversation\|telegramPendingConfirmation" src/main/kotlin --include="*.kt" | grep -v "Repository.kt\|Service.kt" | grep -n "."
```

For any HTTP-layer callers (e.g., `TelegramSchedulesController`), add `val userId = RequestContext.get()` and pass it down.

- [ ] **Step 5: Compile**

```bash
cd backend && ./gradlew compileKotlin 2>&1 | tail -20
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 6: Run all backend tests**

```bash
cd backend && ./gradlew test 2>&1 | tail -30
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add -u
git commit -m "feat: scope all Telegram repositories to userId; backend multi-user complete"
```

---

## Task 12: Frontend Auth — API Client, Auth Pages, and AuthContext

**Files:**
- Modify: `frontend/src/api/client.ts`
- Create: `frontend/src/api/auth.ts`
- Create: `frontend/src/features/auth/AuthContext.tsx`
- Create: `frontend/src/features/auth/useAuth.ts`
- Create: `frontend/src/features/auth/LoginPage.tsx`
- Create: `frontend/src/features/auth/RegisterPage.tsx`
- Create: `frontend/src/components/shared/ProtectedRoute.tsx`

- [ ] **Step 1: Update client.ts**

Replace the entire file:

```typescript
import axios from 'axios'

const client = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '',
  withCredentials: true,
})

client.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default client
```

- [ ] **Step 2: Create auth.ts**

```typescript
import client from './client'

export interface AuthUser {
  userId: string
  username: string
}

export const login = (username: string, password: string) =>
  client.post<AuthUser>('/api/auth/login', { username, password }).then(r => r.data)

export const register = (username: string, password: string) =>
  client.post<AuthUser>('/api/auth/register', { username, password }).then(r => r.data)

export const logout = () =>
  client.post('/api/auth/logout').then(() => undefined)

export const getMe = () =>
  client.get<AuthUser>('/api/auth/me').then(r => r.data)
```

- [ ] **Step 3: Create AuthContext.tsx**

```typescript
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getMe, logout as apiLogout, type AuthUser } from '@/api/auth'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMe()
      .then(u => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  function logout() {
    apiLogout().finally(() => {
      setUser(null)
      window.location.href = '/login'
    })
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export { AuthContext }
```

- [ ] **Step 4: Create useAuth.ts**

```typescript
import { useContext } from 'react'
import { AuthContext } from './AuthContext'

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
```

- [ ] **Step 5: Create LoginPage.tsx**

```typescript
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AllocaLogo } from '@/components/shared/AllocaLogo'

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(username, password)
      navigate('/')
    } catch {
      setError('Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <AllocaLogo className="h-8 w-auto text-foreground" />
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create RegisterPage.tsx**

```typescript
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { register } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AllocaLogo } from '@/components/shared/AllocaLogo'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      await register(username, password)
      navigate('/onboarding')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Registration failed. Try a different username.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <AllocaLogo className="h-8 w-auto text-foreground" />
          <p className="text-sm text-muted-foreground">Create your account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            placeholder="Username (3–50 characters)"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            minLength={3}
            maxLength={50}
            required
          />
          <Input
            type="password"
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          <Input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Create ProtectedRoute.tsx**

```typescript
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        Loading...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
```

- [ ] **Step 8: Typecheck**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/api/client.ts \
  frontend/src/api/auth.ts \
  frontend/src/features/auth/AuthContext.tsx \
  frontend/src/features/auth/useAuth.ts \
  frontend/src/features/auth/LoginPage.tsx \
  frontend/src/features/auth/RegisterPage.tsx \
  frontend/src/components/shared/ProtectedRoute.tsx
git commit -m "feat: add AuthContext, login/register pages, and ProtectedRoute"
```

---

## Task 13: Frontend App.tsx Routing and Sidebar Logout

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/layouts/app-layout.tsx`

- [ ] **Step 1: Replace App.tsx**

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { AuthProvider } from './features/auth/AuthContext'
import { useAuth } from './features/auth/useAuth'
import { ProtectedRoute } from './components/shared/ProtectedRoute'
import LoginPage from './features/auth/LoginPage'
import RegisterPage from './features/auth/RegisterPage'
import OnboardingPage from './pages/OnboardingPage'
import TransactionFormPage from './pages/TransactionFormPage'
import DashboardPage from './pages/DashboardPage'
import MonthlyFlowPage from './pages/MonthlyFlowPage'
import ProfilePage from './pages/ProfilePage'
import AllocationPage from './pages/AllocationPage'
import WatchlistPage from './pages/WatchlistPage'
import RecommendationsPage from './pages/RecommendationsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import RiskPage from './pages/RiskPage'
import OptionsPage from './pages/OptionsPage'
import OptionsTransactionFormPage from './pages/OptionsTransactionFormPage'
import AlertsPage from './pages/AlertsPage'
import ImportPage from './pages/ImportPage'
import BriefingPage from './pages/BriefingPage'
import { AppLayout } from './layouts/app-layout'
import { CurrencyProvider } from './contexts/currency-context'
import type { UserProfile } from './types'
import { useState } from 'react'
import { getProfile } from './api/profile'
import { useEffect } from 'react'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('App crash:', error, info.componentStack) }
  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-foreground">
          <h1 className="text-xl font-bold text-destructive">Something went wrong</h1>
          <pre className="max-w-2xl overflow-auto rounded-lg bg-muted p-4 text-xs text-destructive">
            {this.state.error.message}{'\n\n'}{this.state.error.stack}
          </pre>
          <button onClick={() => this.setState({ error: null })} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function AppRoutes() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined)

  useEffect(() => {
    if (!user) { setProfile(null); return }
    getProfile()
      .then(p => setProfile(p))
      .catch(() => setProfile(null))
  }, [user])

  if (user && profile === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        Loading...
      </div>
    )
  }

  const needsOnboarding = user && (!profile || !profile.onboardingCompleted)

  return (
    <CurrencyProvider currency={profile?.preferredCurrency ?? 'USD'}>
      <Routes>
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" replace />} />
        <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/" replace />} />
        <Route path="/onboarding" element={
          <ProtectedRoute>
            {needsOnboarding ? <OnboardingPage onComplete={setProfile} /> : <Navigate to="/" replace />}
          </ProtectedRoute>
        } />
        <Route element={
          <ProtectedRoute>
            {needsOnboarding
              ? <Navigate to="/onboarding" replace />
              : <AppLayout tracksEnabled={profile?.tracksEnabled ?? []} />
            }
          </ProtectedRoute>
        }>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/briefing" element={<BriefingPage />} />
          <Route path="/transactions/new" element={<TransactionFormPage />} />
          <Route path="/monthly-flow" element={<MonthlyFlowPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/allocations" element={<AllocationPage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/risk" element={<RiskPage />} />
          <Route path="/options" element={<OptionsPage />} />
          <Route path="/options/new" element={<OptionsTransactionFormPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/import" element={<ImportPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </CurrencyProvider>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
```

- [ ] **Step 2: Add logout button to app-layout.tsx**

In `frontend/src/layouts/app-layout.tsx`, add `LogOut` to the lucide-react imports and import `useAuth`:

```typescript
import { LogOut, ... } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
```

In the `AppLayout` function body, add:
```typescript
const { logout } = useAuth()
```

In the "Bottom actions" section, add a logout button before the theme toggle:

```tsx
<button
  onClick={logout}
  title={collapsed ? 'Logout' : undefined}
  className={cn(
    'flex w-full items-center rounded-lg text-sidebar-foreground/60 transition-all duration-150 hover:bg-destructive/10 hover:text-destructive',
    collapsed ? 'justify-center px-0 py-2 mx-1' : 'gap-2.5 px-3 py-2',
  )}
>
  <LogOut className="h-4 w-4 shrink-0 text-sidebar-foreground/40" />
  {!collapsed && <span className="text-sm font-medium">Logout</span>}
</button>
```

- [ ] **Step 3: Typecheck**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors.

- [ ] **Step 4: Start the dev server and verify the full flow**

```bash
cd frontend && npm run dev
```

1. Open `http://localhost:3000` — should redirect to `/login`
2. Click "Register", create an account → should go to `/onboarding`
3. Complete onboarding → should reach the dashboard
4. Refresh the page — should stay logged in (cookie persists)
5. Click Logout in the sidebar → should return to `/login`
6. Log back in with the same credentials → should reach the dashboard

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx frontend/src/layouts/app-layout.tsx
git commit -m "feat: add auth routing and logout to sidebar; frontend multi-user complete"
```

---

## Post-Implementation

- [ ] **Add `JWT_SECRET` to Render environment variables** — generate a random string of at least 32 characters and add it as `JWT_SECRET` in your Render service settings
- [ ] **Push to main and verify Render + Vercel deployments build cleanly**

```bash
git push origin main
```

Expected: Vercel frontend deploys, Render backend deploys. V15 migration runs on first boot.

- [ ] **Test the cloud deployment end-to-end**: register, onboard, check data isolation by registering a second account in a separate browser profile
