# Phase 12 — WhatsApp Bot (Full Inbound Capability)

**Goal:** Upgrade WhatsApp from outbound-only notifications to a full two-way conversational bot. The user can ask questions and take actions (log trades, start monthly flow, set alerts, manage watchlist) entirely through WhatsApp. Every write action requires explicit confirmation.

**Prerequisite:** Phase 11 complete. Twilio outbound already working (V4 migration + `WhatsAppNotificationService`).

**Status:** ⬜ Not started

---

## Backend Tasks

### Database Schema
- [ ] Migration: `whatsapp_conversations` table
  - `id`, `session_id` (UUID), `direction` (INBOUND/OUTBOUND), `message_body`, `intent` (nullable), `intent_data` (JSONB), `twilio_sid`, `created_at`
- [ ] Migration: `whatsapp_pending_confirmations` table
  - `id`, `session_id`, `intent`, `intent_data` (JSONB), `confirmation_message`, `state` (AWAITING_CONFIRMATION/PROCESSING), `expires_at`, `resolved` (boolean), `resolution` (CONFIRMED/CANCELLED/EXPIRED), `created_at`

### Twilio Webhook
- [ ] `POST /api/whatsapp/inbound` — Twilio webhook endpoint
  - validate Twilio signature
  - parse `From`, `Body`, `MessageSid`
  - route to `WhatsAppBotService`
  - respond with empty TwiML (reply sent separately)

### Bot Orchestration
- [ ] `WhatsAppBotService` — entry point for all inbound messages:
  - resolve or create session (new session after 30 min inactivity)
  - check for open pending confirmation first (yes/no handling)
  - otherwise classify intent via Claude API
  - route to read or write handler
  - log all messages to `whatsapp_conversations`

### Session Management
- [ ] `WhatsAppSessionRepository` — derive active session from recent `whatsapp_conversations` (last message within 30 min = same session, else new UUID)

### Intent Classification
- [ ] `WhatsAppIntentClassifier` — calls Claude with message + session history:
  - returns intent enum + extracted entities (symbol, amount, quantity, price, day, time)
  - read intents: PORTFOLIO_STATUS, ALLOCATION_CHECK, TOP_PERFORMERS, WATCHLIST_QUERY, STOCK_ANALYSIS, CONCEPT_QUESTION
  - write intents: LOG_TRANSACTION, START_MONTHLY_FLOW, SET_ALERT, ADD_WATCHLIST, REMOVE_WATCHLIST, SCHEDULE_MESSAGE

### Read Intent Handlers
- [ ] `PORTFOLIO_STATUS` — total value, daily change, P&L, top holdings (WhatsApp plain-text format)
- [ ] `ALLOCATION_CHECK` — current vs target per position, drift status
- [ ] `TOP_PERFORMERS` — biggest gainers and losers from holdings
- [ ] `WATCHLIST_QUERY` — list watchlist items with latest signal
- [ ] `STOCK_ANALYSIS` — full AI analysis for a symbol (calls existing `WatchlistService`)
- [ ] `CONCEPT_QUESTION` — pass to `ChatService` for general explanation

### Write Intent Handlers (all require confirmation)
- [ ] `LOG_TRANSACTION` — parse symbol, type, quantity, price → show confirmation → execute via `TransactionService`
- [ ] `START_MONTHLY_FLOW` — parse amount → run `MonthlyInvestmentService.preview()` → show allocation breakdown → on confirm, execute
- [ ] `SET_ALERT` — parse symbol, condition, threshold → show confirmation → create via `AlertService`
- [ ] `ADD_WATCHLIST` — parse symbol → show confirmation → add via `WatchlistService`
- [ ] `REMOVE_WATCHLIST` — parse symbol → show confirmation → remove via `WatchlistService`
- [ ] `SCHEDULE_MESSAGE` — parse type, frequency, day, time → show confirmation → create schedule (Phase 13)

### Confirmation Flow
- [ ] `WhatsAppConfirmationService`:
  - on write intent: save `whatsapp_pending_confirmations`, send confirmation message
  - on "yes": execute action, resolve as CONFIRMED
  - on "no": resolve as CANCELLED
  - expiry job: mark unresolved confirmations as EXPIRED after 5 min
- [ ] `@Scheduled` job every minute to expire stale confirmations

### Message Formatting
- [ ] `WhatsAppMessageFormatter` — plain text with emoji, no markdown:
  - portfolio summary format (see PRD §5.13)
  - confirmation card format
  - error messages

### Portfolio Context Injection
- [ ] `WhatsAppContextBuilder` — assembles full context for Claude per session:
  - holdings (symbol, quantity, value, P&L)
  - allocation gaps per position
  - risk profile (level, time horizon, goal)
  - monthly investment range
  - enabled tracks

---

## Frontend Tasks

### Settings Page — WhatsApp Section
- [ ] Connection status indicator (connected / not configured)
- [ ] Phone number entry / update field
- [ ] Enable / disable WhatsApp bot toggle
- [ ] "Test connection" button — sends a test message via Twilio

---

## Validation Checklist

- [ ] Inbound message received, logged, intent classified correctly
- [ ] Read intents return response without confirmation
- [ ] Write intents send confirmation message before executing
- [ ] "yes" executes the action and logs the transaction/alert/etc.
- [ ] "no" cancels cleanly with a cancellation message
- [ ] Pending confirmation expires after 5 min if no reply
- [ ] New session starts after 30 min inactivity
- [ ] Monthly flow via WhatsApp produces same allocation math as in-app flow
- [ ] All responses are plain text (no markdown syntax)
- [ ] Invalid or ambiguous messages get a helpful fallback response
- [ ] Twilio signature validation rejects spoofed requests
