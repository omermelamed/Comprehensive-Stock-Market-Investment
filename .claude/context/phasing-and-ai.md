# Phasing and AI

## Build order

Phases 1–9 are complete. Phases 10–16 are the remaining work.

### Completed

1. transaction entry and dashboard
2. target allocation setup and monthly investment flow without AI
3. AI summaries for monthly flow
4. watchlist analysis
5. recommendation engine
6. chatbot (backend only)
7. performance and risk analytics (backend only)
8. options tracking (backend only)
9. WhatsApp outbound investment summary notifications

### Remaining

**Phase 10 — Rebuild deleted frontend pages**
Backend APIs exist. Rebuild the frontend layer only.
- Chat panel (`ChatPanel`, `useChatPanel`, `api/chat.ts`)
- Analytics page (`AnalyticsPage`, `api/analytics.ts`)
- Risk page (`RiskPage`, `api/risk.ts`)
- Options page (`OptionsPage`, `OptionsPositionsTable`, `OptionsStrategyPanel`, `OptionsTransactionForm`, `OptionsTransactionFormPage`, `useOptions`, `api/options.ts`)

**Phase 11 — Alerts UI**
Backend scheduler and `AlertController` exist. Build the frontend:
- In-app notification badge in nav
- Alerts management page (create, list, re-enable)
- "Set Alert" action wired from Watchlist page

**Phase 12 — WhatsApp bot — full inbound capability**
Currently outbound-only. Add conversational inbound bot:
- DB: `whatsapp_conversations`, `whatsapp_pending_confirmations` tables
- Twilio webhook handler + inbound message parsing
- Intent classification via Claude API (read vs write)
- Read intents: portfolio status, gaps, top performers, watchlist, stock analysis
- Write intents: log transaction, start monthly flow, set alert, add/remove watchlist
- Confirmation flow (pending → yes/no → expire after 5 min)
- Session management (new session after 30 min inactivity)
- Settings UI: connection status, enable/disable toggle, phone number

**Phase 13 — Scheduled WhatsApp messages**
Requires Phase 12 (outbound infrastructure). Add user-configurable schedules:
- DB: `whatsapp_scheduled_messages`, `whatsapp_scheduled_message_log`, `upcoming_scheduled_messages` view
- CRUD API for schedules (create, list, toggle, edit, delete)
- Spring `@Scheduled` job every minute — fires due messages, updates `next_send_at`
- Message generators for: PORTFOLIO_SUMMARY, PERFORMANCE_REPORT, ALLOCATION_CHECK, INVESTMENT_REMINDER, TOP_MOVERS
- Settings page: schedule list, create/edit form, send history per schedule

**Phase 14 — Import & Export**
Nothing implemented. Self-contained, no dependencies on other phases:
- Import: CSV + Excel upload, column mapping UI, validation preview, row-level errors, bulk insert via transaction ledger
- Export: Holdings, full transaction history, P&L report — CSV and Excel

**Phase 15 — Risk profile history & AI refinement**
Extend existing risk level in `user_profile`:
- DB: `risk_score_history` table (or append-only log)
- Display AI reasoning for last score update
- Show score change history over time
- Auto re-evaluation trigger after N new transactions

**Phase 16 — Onboarding gaps**
Complete the remaining onboarding steps from PRD v1.4:
- Step 5: WhatsApp setup within onboarding flow (number + enable/disable)
- Timezone selection saved to `user_profile.timezone`
- Tracks of interest multi-select (Long / Short / Crypto / Options) → `tracks_enabled`

## AI principle

AI should enrich judgment, not replace the deterministic core.

## Practical rule

If a feature depends on both financial formulas and AI commentary:
- build the formula path first
- expose the raw deterministic output cleanly
- add AI text as an optional layer on top

## Example

For the monthly flow, the model may say:
"You are underweight in VOO and current valuation signals look acceptable."
But the exact amount suggested must come from the formula engine, not from the model.
