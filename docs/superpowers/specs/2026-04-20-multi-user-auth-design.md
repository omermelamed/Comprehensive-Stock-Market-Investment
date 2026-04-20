# Multi-User Authentication Design

## Goal

Transform the app from a single-user local tool into a multi-user platform where each user has their own isolated account, data, and settings. Authentication uses username/password with a JWT stored in an HttpOnly cookie (1-day expiry).

## Constraints

- Existing single-user data is **wiped** (fresh start for all users including the original owner).
- Open registration — anyone can create an account.
- No Spring Security — manual JWT filter only.
- JWT stored in `HttpOnly; Secure; SameSite=Strict` cookie named `auth_token`, valid for 1 day.

---

## Section 1: Database Schema

### New table: `users`

```sql
CREATE TABLE users (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,  -- bcrypt
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);
```

### Schema changes to all existing data tables

Add `user_id UUID NOT NULL REFERENCES users(id)` to every data-owning table:

| Table | Notes |
|---|---|
| `user_profile` | Remove `UNIQUE INDEX idx_user_profile_single_row`; add `user_id`; unique constraint becomes `UNIQUE(user_id)` |
| `transactions` | Add `user_id` |
| `target_allocations` | Add `user_id` |
| `portfolio_snapshots` | Add `user_id`; drop `idx_portfolio_snapshots_date`; new unique constraint `UNIQUE(user_id, date)` |
| `watchlist` | Add `user_id`; drop `idx_watchlist_symbol`; new unique constraint `UNIQUE(user_id, UPPER(symbol))` |
| `alerts` | Add `user_id` |
| `options_transactions` | Add `user_id` |
| `risk_score_history` | Add `user_id` |
| `telegram_conversations` | Add `user_id` |
| `telegram_scheduled_messages` | Add `user_id` |
| `telegram_pending_confirmations` | Add `user_id` |

All existing data is truncated/dropped as part of migration (fresh start).

Migration file: `V15__multi_user_auth.sql`

---

## Section 2: Backend Auth Layer

### Dependencies

Add to `build.gradle.kts`:
- `spring-security-crypto` (bcrypt only, no full Spring Security)
- `io.jsonwebtoken:jjwt-api`, `jjwt-impl`, `jjwt-jackson` (JWT generation and validation)

### New endpoints

| Method | Path | Auth required | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Create account, return JWT cookie |
| `POST` | `/api/auth/login` | No | Validate credentials, return JWT cookie |
| `POST` | `/api/auth/logout` | No | Clear cookie |
| `GET` | `/api/auth/me` | Yes | Return `{ userId, username }` |

**Request DTOs:**
```kotlin
data class AuthRequest(val username: String, val password: String)
data class AuthResponse(val userId: UUID, val username: String)
```

### JWT cookie

- Name: `auth_token`
- Value: signed JWT with `sub = userId (UUID string)`, `exp = now + 1 day`
- Flags: `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`
- Secret: loaded from env var `JWT_SECRET` (min 32 chars)

### `RequestContext` — ThreadLocal user holder

```kotlin
object RequestContext {
    private val userId = ThreadLocal<UUID>()
    fun set(id: UUID) = userId.set(id)
    fun get(): UUID = userId.get() ?: throw UnauthorizedException("Not authenticated")
    fun clear() = userId.remove()
}
```

### `JwtAuthFilter`

- Extends `OncePerRequestFilter`
- Skips paths matching `/api/auth/**`
- Reads `auth_token` cookie from request
- Validates JWT signature and expiry
- On success: calls `RequestContext.set(userId)` then `filterChain.doFilter(...)`
- On failure: returns `401 Unauthorized` JSON immediately
- In `finally`: calls `RequestContext.clear()`

### New classes

| Class | Package | Responsibility |
|---|---|---|
| `AuthController` | `api` | Login, register, logout, me endpoints |
| `AuthRequest` | `api/dto` | `{ username, password }` |
| `AuthResponse` | `api/dto` | `{ userId, username }` |
| `JwtAuthFilter` | `config` | Cookie → JWT → RequestContext |
| `JwtService` | `application` | Generate and validate JWTs |
| `RequestContext` | `config` | ThreadLocal userId holder |
| `UserRepository` | `infrastructure` | CRUD for `users` table |
| `UserService` | `application` | Register, login logic |
| `UnauthorizedException` | `domain` | Maps to 401 in GlobalExceptionHandler |

---

## Section 3: Frontend Auth

### New pages and routes

| Route | Component | Notes |
|---|---|---|
| `/login` | `LoginPage` | Username + password form |
| `/register` | `RegisterPage` | Username + password + confirm password |

Both pages are public (no auth required). All other routes are wrapped in `ProtectedRoute`.

### `AuthContext`

```typescript
interface AuthUser { userId: string; username: string }
interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  logout: () => void
}
```

- On mount: calls `GET /api/auth/me`
  - Success → sets `user`, renders app
  - `401` → sets `user = null`, `ProtectedRoute` redirects to `/login`
- `logout()` calls `POST /api/auth/logout`, clears `user`, redirects to `/login`

### `ProtectedRoute`

Wraps all existing routes in `AppRouter`. If `loading` is true, shows a full-page skeleton. If `user` is null, redirects to `/login`.

### Global 401 interceptor

In the API client (`src/api/client.ts` or inline in fetch wrapper): any `401` response triggers a redirect to `/login`. This catches expired cookies gracefully.

### New files

| File | Responsibility |
|---|---|
| `src/features/auth/AuthContext.tsx` | Context + provider |
| `src/features/auth/useAuth.ts` | Hook to consume AuthContext |
| `src/features/auth/LoginPage.tsx` | Login form page |
| `src/features/auth/RegisterPage.tsx` | Register form page |
| `src/components/shared/ProtectedRoute.tsx` | Auth gate wrapper |
| `src/api/auth.ts` | `login()`, `register()`, `logout()`, `getMe()` API calls |

### Sidebar logout

Add a logout button in the sidebar bottom section (next to theme toggle), using the `LogOut` lucide icon.

---

## Section 4: Data Isolation

### Pattern

Every repository method that reads or writes data adds a `userId: UUID` parameter. Every query adds `WHERE user_id = ?`. Every INSERT includes `user_id`.

**Before:**
```kotlin
fun findAll(): List<TransactionResponse> =
    dsl.fetch("SELECT * FROM transactions ORDER BY executed_at DESC")
```

**After:**
```kotlin
fun findAll(userId: UUID): List<TransactionResponse> =
    dsl.fetch("SELECT * FROM transactions WHERE user_id = ? ORDER BY executed_at DESC", userId)
```

### Service pattern

Services call `RequestContext.get()` once at entry and pass `userId` down to repositories:

```kotlin
fun getAll(): List<TransactionResponse> {
    val userId = RequestContext.get()
    return transactionRepository.findAll(userId)
}
```

### Affected repositories (all methods gain `userId`)

- `UserProfileRepository`
- `TransactionRepository`
- `AllocationRepository`
- `PortfolioSnapshotRepository`
- `WatchlistRepository`
- `AlertRepository`
- `OptionsTransactionRepository`
- `RiskScoreHistoryRepository`
- `TelegramConversationRepository`
- `TelegramScheduledMessageRepository`
- `TelegramPendingConfirmationRepository`

### Onboarding

Works exactly as before. After registration, the JWT cookie is set and the frontend redirects to onboarding. The onboarding flow creates `user_profile` scoped to the logged-in `userId`.

---

## Error handling

| Scenario | Behavior |
|---|---|
| Missing or expired cookie | `JwtAuthFilter` returns `401` |
| Wrong username/password | `AuthController` returns `401` |
| Username already taken | `AuthController` returns `409 Conflict` |
| Any 401 in frontend | Global interceptor redirects to `/login` |
| Token cleared on logout | Cookie cleared server-side, `RequestContext` is ThreadLocal so no shared state risk |

---

## Out of scope

- Password reset / forgot password
- Email verification
- Admin user management UI
- Rate limiting on login endpoint
- OAuth / social login
