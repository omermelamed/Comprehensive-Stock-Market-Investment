# Product Requirements Document (PRD)

## Personal Investment Portfolio Platform

**Version:** 1.4
**Status:** Draft
**Last Updated:** April 2026

> **Context:** This is a locally-run investment platform built with Claude Code.
> It runs on a single machine. Architecture decisions reflect this —
> simplicity and usefulness are prioritized over enterprise-grade infrastructure.
>
> **Core Principle: Zero hardcoded user data.**
> Every user-specific value — allocations, risk profile, investment amounts,
> time horizon, currency preference — is entered by the user through the UI
> and stored in the database. The app works correctly for any user with any strategy.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Goals & Success Metrics](#2-goals--success-metrics)
3. [Tech Stack](#3-tech-stack)
4. [Data Architecture](#4-data-architecture)
5. [Features & Requirements](#5-features--requirements)
   - 5.1 Onboarding Flow
   - 5.2 Portfolio Entry & Transaction Management
   - 5.3 **Monthly Investment Flow** ← Core Feature
   - 5.4 Dashboard
   - 5.5 AI Recommendation Engine & Sub-Agents
   - 5.6 Personalized Risk Profile
   - 5.7 Options Trading
   - 5.8 **AI Chatbot** ← Full action capabilities
   - 5.9 Watchlist
   - 5.10 Alerts & Notifications
   - 5.11 Performance Analytics
   - 5.12 Risk Management
   - 5.13 **WhatsApp Bot** ← Full action capabilities
   - 5.14 **Scheduled WhatsApp Messages** ← User-configurable
   - 5.15 Import & Export
   - 5.16 Daily Snapshot Job & Catch-Up System
6. [External APIs](#6-external-apis)
7. [Design System](#7-design-system)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Build Order](#9-build-order)
10. [Future Features](#10-future-features)

---

## 1. Overview

A locally-run investment portfolio management platform. Since direct broker API
integrations are unavailable, the platform uses a
**manual entry + real-time market data** model:

- User enters holdings and transactions manually.
- The app fetches live prices from external APIs and calculates all changes automatically.
- A daily background job snapshots portfolio value to power historical charts.
- A catch-up job runs on every app startup to fill any missing snapshots.

### The Core Problem This Solves

Every month, the user has a variable amount to invest. The hardest question
is always: **"What exactly should I buy this month?"**

This platform answers that question precisely — comparing the user's current vs. target
allocation (which they define), calculating gaps per position, fetching real financial
metrics, and layering AI reasoning on top. The user makes the final decision with full
information.

### Philosophy

- **Portfolio-aware AI** — Every recommendation is based on what the user already owns,
  what they're missing, and what their own strategy says they should hold.
- **Investor, not trader** — The platform is built for long-term, buy-and-hold investing.
  It discourages unnecessary selling and encourages consistent monthly contributions.
- **User-defined strategy** — The app has no opinion on what the right allocation is.
  The user defines their target allocation, risk profile, and investment goals during
  onboarding. The app executes against that strategy.
- **Action-capable AI** — Both the in-app chatbot and WhatsApp bot can take real actions,
  not just answer questions. Every write action requires explicit user confirmation.
- **Simplicity first** — Runs locally. No unnecessary infrastructure.

---

## 2. Goals & Success Metrics

| Goal | Metric |
|------|--------|
| Answer "what should I buy this month?" | Monthly Investment Flow completed in < 2 minutes |
| Portfolio always reflects reality | Holdings match manual transactions perfectly |
| AI recommendations feel personal | Every recommendation references current holdings and gaps |
| Historical data is always complete | Catch-up job fills gaps; snapshot success rate 99.5% |
| App starts fast | Dashboard loads under 2 seconds |
| Any user can use the app | Zero hardcoded values — all data from onboarding |
| Chatbot feels powerful | User can complete any action through chat alone |
| WhatsApp feels like a second home | User can manage portfolio without opening the app |

---

## 3. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Backend | Kotlin + Spring Boot | |
| Frontend | React + TypeScript | |
| Database | PostgreSQL | SQLite acceptable as lighter alternative |
| Scheduler | Spring @Scheduled | |
| Market Data | Yahoo Finance / Alpha Vantage / Polygon.io | See API section |
| AI Engine | Anthropic Claude API | Orchestrator + Sub-Agents |
| AI Chatbot | Anthropic Claude API | Portfolio-aware + action-capable |
| WhatsApp | Twilio WhatsApp API | Inbound + outbound messaging |
| Charts | TradingView Lightweight Charts + Recharts | |
| Animations | Framer Motion | |
| DevOps | Docker + Docker Compose | Optional for local use |

> **Simplifications vs. original PRD:**
> - **No Redis** — local latency doesn't require caching infrastructure
> - **No JWT / 2FA / bcrypt** — single-user local app, no authentication needed
> - **No session management** — app opens directly to dashboard
> - **Docker is optional** — run directly with gradle + npm if preferred

### Monorepo Structure

```
broker-app/
├── backend/
│   ├── src/
│   │   ├── api/              # REST controllers
│   │   ├── models/           # DB entities
│   │   ├── services/         # Business logic
│   │   ├── scheduler/        # Snapshot, catch-up, WhatsApp scheduled jobs
│   │   ├── whatsapp/         # Twilio webhook handler + bot logic
│   │   └── config/           # CORS, DB config
│   ├── build.gradle.kts
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── api/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

### Environment Configuration

```
.env.local        ← local development (primary)
.env.production   ← future server deployment (zero code changes required)
```

---

## 4. Data Architecture

### Core Entities

#### `transactions`

The source of truth for all portfolio data. Holdings are always **derived** from this
table — never stored as a separate state.
`source` field tracks whether the transaction was created from the app, chatbot,
WhatsApp bot, or imported.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| symbol | VARCHAR | User-entered e.g. VOO, AAPL, BTC-USD |
| type | ENUM | BUY, SELL, SHORT, COVER |
| track | ENUM | LONG, SHORT, CRYPTO |
| quantity | DECIMAL | |
| price_per_unit | DECIMAL | Price at time of transaction |
| total_value | DECIMAL | Generated column: quantity × price_per_unit |
| source | VARCHAR | APP, CHATBOT, WHATSAPP, IMPORT |
| notes | TEXT | Optional user notes |
| executed_at | TIMESTAMP | Date/time of trade |
| created_at | TIMESTAMP | |

#### `target_allocations`

The user's desired portfolio allocation — defined during onboarding, editable at any
time. The foundation of the Monthly Investment Flow.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| symbol | VARCHAR | User-entered symbol |
| asset_type | ENUM | ETF, STOCK, BOND, REIT, CRYPTO |
| target_percentage | DECIMAL | User-entered e.g. 45.0 for 45% |
| label | VARCHAR | User-friendly name, entered by user |
| display_order | INTEGER | Controls card order in UI |
| updated_at | TIMESTAMP | |

> **Validation rule:** Sum of all `target_percentage` values must equal exactly 100%.
> Enforced by the UI with a live tracker and verified by `check_total_allocation()`.

#### `user_profile`

All user-specific settings. No default values — every field set by the user.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| display_name | VARCHAR | User's chosen name |
| preferred_currency | VARCHAR | User-selected e.g. ILS, USD, EUR |
| risk_level | ENUM | CONSERVATIVE, MODERATE, AGGRESSIVE |
| time_horizon_years | INTEGER | User-entered |
| monthly_investment_min | DECIMAL | User-entered lower bound |
| monthly_investment_max | DECIMAL | User-entered upper bound |
| investment_goal | TEXT | User-entered e.g. "Family wealth" |
| tracks_enabled | JSONB | e.g. ["LONG", "REIT", "BOND"] |
| questionnaire_answers | JSONB | Raw onboarding answers |
| ai_inferred_score | DECIMAL | 0.0–1.0, updated by AI over time |
| theme | VARCHAR | DARK or LIGHT — user preference |
| whatsapp_number | VARCHAR | Set by user in Settings |
| whatsapp_enabled | BOOLEAN | Set by user in Settings |
| timezone | VARCHAR | e.g. 'Asia/Jerusalem' — for scheduled messages |
| onboarding_completed | BOOLEAN | Gates the entire app |

#### `portfolio_snapshots`

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| date | DATE | One record per day (unique) |
| total_value | DECIMAL | In user's preferred currency |
| daily_pnl | DECIMAL | vs previous day |
| daily_pnl_pct | DECIMAL | Percentage change |
| snapshot_source | ENUM | SCHEDULED, CATCHUP |

#### `alerts`

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| symbol | VARCHAR | |
| condition | ENUM | ABOVE, BELOW |
| threshold_price | DECIMAL | |
| note | TEXT | Optional user label |
| source | VARCHAR | APP, CHATBOT, WHATSAPP |
| is_active | BOOLEAN | |
| triggered_at | TIMESTAMP | Nullable |

#### `options_transactions`

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| underlying_symbol | VARCHAR | |
| option_type | ENUM | CALL, PUT |
| action | ENUM | BUY, SELL |
| strike_price | DECIMAL | |
| expiration_date | DATE | |
| contracts | INTEGER | 1 contract = 100 shares |
| premium_per_contract | DECIMAL | |
| total_premium | DECIMAL | Generated column |
| status | ENUM | ACTIVE, EXPIRED, EXERCISED, CLOSED |

#### `whatsapp_scheduled_messages`

User-defined scheduled messages. Everything set by user in Settings — nothing hardcoded.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| message_type | ENUM | PORTFOLIO_SUMMARY, PERFORMANCE_REPORT, ALLOCATION_CHECK, INVESTMENT_REMINDER, TOP_MOVERS |
| label | VARCHAR | User's own label e.g. "Sunday check-in" |
| frequency | ENUM | WEEKLY, BIWEEKLY, MONTHLY |
| day_of_week | INTEGER | 0=Sun–6=Sat. Used for WEEKLY and BIWEEKLY |
| biweekly_week | INTEGER | 1 or 2. Used for BIWEEKLY only |
| day_of_month | INTEGER | 1–28. Used for MONTHLY only |
| send_time | TIME | User-chosen time |
| is_active | BOOLEAN | |
| last_sent_at | TIMESTAMP | |
| next_send_at | TIMESTAMP | Pre-computed by scheduler |
| send_count | INTEGER | |

#### `whatsapp_conversations`

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| session_id | UUID | Groups messages into one conversation |
| direction | VARCHAR | INBOUND or OUTBOUND |
| message_body | TEXT | |
| intent | ENUM | Parsed intent (null for outbound) |
| intent_data | JSONB | Extracted entities e.g. {symbol, amount} |
| twilio_sid | VARCHAR | Twilio message SID |

#### `whatsapp_pending_confirmations`

Stores a parsed write intent while waiting for user to confirm or cancel.
Expires after 5 minutes.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| session_id | UUID | |
| intent | ENUM | The write intent being confirmed |
| intent_data | JSONB | Full parsed action ready to execute |
| confirmation_message | TEXT | Message sent asking yes/no |
| state | ENUM | AWAITING_CONFIRMATION, PROCESSING |
| expires_at | TIMESTAMP | 5 minutes from creation |
| resolved | BOOLEAN | |
| resolution | VARCHAR | CONFIRMED, CANCELLED, EXPIRED |

---

## 5. Features & Requirements

---

### 5.1 Onboarding Flow

**Description:** A guided first-run setup. The app detects `onboarding_completed = false`
and redirects here before showing any other screen.
**No user data is assumed or hardcoded. Everything comes from this flow.**

#### Step 1 — Welcome & Basic Info
- Display name
- Preferred currency (ILS / USD / EUR / GBP / other)
- Timezone (dropdown — used for scheduled message timing)

#### Step 2 — Investment Profile Questionnaire

| Question | Options |
|---------|---------|
| Investment experience | Beginner / Some experience / Experienced |
| Time horizon | 1–3 years / 3–10 years / 10–20 years / 20+ years |
| Monthly investment min | Free number input |
| Monthly investment max | Free number input |
| Reaction to 20% drop | Sell everything / Hold steady / Buy more |
| Investment goal | Free text |
| Tracks of interest | Multi-select: Long / Short / Crypto / Options |

#### Step 3 — Target Allocation Setup

User defines their complete target portfolio allocation.

- Search and add any symbol
- Enter a label and target percentage per position
- Live tracker shows running total (must reach 100% to proceed)
- Cannot save until total = exactly 100%

#### Step 4 — Initial Holdings (Optional)
- Enter manually, import CSV, or skip

#### Step 5 — WhatsApp Setup (Optional)
- Enter WhatsApp number
- Enable/disable WhatsApp bot
- Can be configured later in Settings

#### Step 6 — Confirmation
Summary of everything entered. On confirm: `onboarding_completed = true`.

All settings editable at any time via the **Settings** page.

---

### 5.2 Portfolio Entry & Transaction Management

**Description:** User manually logs all buy/sell activity. Holdings always computed
from full transaction history.

#### Transaction Entry Fields

| Field | Required | Notes |
|-------|---------|-------|
| Symbol | Yes | Auto-complete from target allocations + free search |
| Transaction Type | Yes | BUY / SELL / SHORT / COVER |
| Track | Yes | Long / Short / Crypto |
| Quantity | Yes | |
| Price Per Unit | Yes | |
| Date & Time | Yes | Defaults to now |
| Notes | No | |

#### Validation
- Selling more than held → blocked with clear error
- Holdings = sum(BUY) - sum(SELL) always

---

### 5.3 Monthly Investment Flow ⭐ Core Feature

**Description:** The most important feature. User enters monthly investment amount.
System calculates gaps, fetches metrics, generates AI summaries per position.
User adjusts and confirms. Transactions logged automatically.

#### Gap Calculation Logic

```
Total Portfolio Value     = sum of (quantity × current_price) for all holdings
Target Value for Position = Total Portfolio Value × user's target_percentage
Current Value             = quantity_held × current_price
Gap                       = Target Value - Current Value

If Gap > 0  → UNDERWEIGHT → suggest investing
If Gap <= 0 → OVERWEIGHT  → suggest 0 (never suggest selling)
```

#### Suggested Allocation Logic

```
Total Positive Gap    = sum of all gaps where Gap > 0
Position Weight       = Position Gap / Total Positive Gap
Position Suggested    = Monthly Amount × Position Weight
```

#### Position Card Design

Each underweight position:
```
┌─────────────────────────────────────────────────────┐
│  [Symbol] — [User's label]                          │
│  Target: X% │ Current: Y% │ Gap: Z% (underweight)   │
├─────────────────────────────────────────────────────┤
│  P/E        │  PEG        │  D/E       │  FCF        │
│  [value]    │  [value]    │  [value]   │  [value]    │
│  [🟢/🟡/🔴] │  [🟢/🟡/🔴] │ [🟢/🟡/🔴]│ [🟢/🔴]   │
├─────────────────────────────────────────────────────┤
│  💬 AI Summary (portfolio-aware, not generic)        │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────┐                                │
│  │  [editable ₪]   │  ← user adjusts this           │
│  └─────────────────┘                                │
└─────────────────────────────────────────────────────┘
```

Overweight positions show ₪0 with a simple "no action needed" message.

#### Metric Signal Colors

| Metric | 🟢 | 🟡 | 🔴 |
|--------|----|----|-----|
| P/E | < 15 | 15–30 | > 30 |
| PEG | < 1 | 1–2 | > 2 |
| D/E | < 1 | 1–2 | > 2 |
| FCF | Positive & growing | Positive flat | Negative |

#### Running Total Footer (sticky)
```
Monthly Budget: [user-entered]   Allocated: [sum]   Remaining: [difference]
```
Turns red if user tries to exceed budget.

#### Confirmation Step
Shows summary of all planned purchases. On confirm → logged as BUY transactions
with `source = APP`.

---

### 5.4 Dashboard

**Description:** Main screen. All data derived from user's own transactions and
target allocation.

#### Portfolio Summary
- Total portfolio value (user's currency)
- Total P&L (absolute + percentage)
- Daily change
- Allocation health vs user's own targets
- **"Invest This Month"** button → launches Monthly Investment Flow
- **Chat button** → opens AI chatbot panel

#### Holdings Table

| Column | Notes |
|--------|-------|
| Symbol | With logo |
| Label | From user's target allocations |
| Track | Long / Short / Crypto badge |
| Target % | From user's target_allocations |
| Current % | Computed live |
| Status | 🟢 On target / 🟡 Slightly off / 🔴 Rebalance needed |
| Quantity | |
| Avg. Buy Price | Computed from transactions |
| Current Price | Live |
| Current Value | |
| P&L | Color coded |

#### Historical Portfolio Chart
- Timeframe selector: 1W / 1M / 3M / 6M / 1Y / All

---

### 5.5 AI Recommendation Engine & Sub-Agents

**Description:** Multi-agent system producing personalized recommendations based on the
user's own portfolio, gaps, and risk profile.

#### Context Always Injected First
- User's risk level, time horizon, investment goal (from `user_profile`)
- Full holdings with P&L (derived from `transactions`)
- Allocation gaps per position (target vs current)
- Monthly investment range

#### Sub-Agent Architecture
```
Orchestrator
├── Long Equity Agent    (if LONG track enabled)
├── Short Agent          (if SHORT track enabled)
├── Crypto Agent         (if CRYPTO track enabled)
├── Options Agent        (if OPTIONS track enabled)
├── REIT Agent           (if REITs in portfolio or target)
└── Bond Agent           (if Bonds in portfolio or target)
```

#### Recommendation Card Output
- Symbol, recommendation (BUY / HOLD / WAIT), current + target price
- P/E, PEG, D/E, FCF with signal colors
- 3–5 sentence AI reasoning (WHY, not just WHAT)
- Portfolio fit note (why this fits THIS user's specific gaps)
- Confidence score, risk level, supporting links

#### Refresh Strategy
- Regenerates on every page visit
- Cached for 15 minutes
- Manual "Refresh" button available

---

### 5.6 Personalized Risk Profile

**Description:** Set during onboarding. Editable from Settings. AI refines score
over time based on actual behavior.

- Display current risk level with explanation
- Show AI reasoning for last score update
- Manual override available at any time
- History of score changes over time

---

### 5.7 Options Trading

**Description:** Track options positions. Only visible if user enabled OPTIONS track.

#### Transaction Entry
- Underlying symbol, CALL/PUT, BUY/SELL, strike price, expiry, contracts, premium

#### Dashboard Display
- Symbol, type, contracts, premium paid, current premium, P&L, days to expiry,
  delta, status
- Days to expiry turns red when < 7 days

---

### 5.8 AI Chatbot ⭐ Full Action Capabilities

**Description:** A portfolio-aware conversational assistant that can both answer
questions AND take actions — covering the full capability of the app through natural
language.

**Key upgrade from original:** The chatbot is no longer read-only. It can execute
every write action in the platform, always with explicit user confirmation first.

#### Two Modes

**Read mode** — instant response, no confirmation needed:
- Portfolio questions ("How is my VOO doing?")
- Allocation status ("Am I on target?")
- AI stock analysis ("Analyze Elbit for me")
- Performance ("How did I do this month?")
- Concept explanations ("What is a PEG ratio?")
- Market conditions ("What's happening in Israeli markets?")
- Watchlist signals ("What does my watchlist show?")

**Write mode** — always confirm before executing:
- Log transactions ("Buy 10 shares of VOO")
- Start Monthly Investment Flow ("I want to invest ₪5,000 this month")
- Set price alerts ("Alert me when Elbit drops below ₪300")
- Add to watchlist ("Add Tesla to my watchlist")
- Remove from watchlist ("Remove Tesla from watchlist")
- Configure a scheduled WhatsApp message ("Send me a weekly summary every Sunday at 9am")

#### Confirmation Flow (Write Mode)

```
User:  "Buy 5 shares of VOO"

Bot:   "I'll log this transaction:
        • BUY 5 shares of VOO
        • Current price: $221.40
        • Total: $1,107.00

        Confirm? (yes / no)"

User:  "yes"

Bot:   "✅ Done! 5 shares of VOO logged at $221.40.
        Your VOO allocation is now 42% (target: 45%)."
```

If user says no or doesn't respond within 5 minutes → action is cancelled, nothing logged.

#### Monthly Investment Flow via Chat

```
User:  "I want to invest ₪4,000 this month"

Bot:   "Here's your suggested allocation for ₪4,000:

        • VOO — underweight by 5% → ₪1,800 (~8 shares)
          P/E: 22 🟡 | PEG: 1.4 🟡 | D/E: 0.4 🟢 | FCF: Strong 🟢
          "Good month to add — trading near fair value with strong cash flow."

        • BND — underweight by 2% → ₪800
          "Bonds are slightly underweight, adding here improves stability."

        • ת"א 125 — underweight by 1% → ₪600
          "Israeli market slightly below target — reasonable to add."

        • REIT ETF — underweight by 1% → ₪800
          "REIT yield remains attractive, adding aligns with your income goal."

        Total: ₪4,000

        Confirm all, or tell me what to adjust."

User:  "Increase VOO to ₪2,200 and reduce BND to ₪400"

Bot:   "Updated:
        • VOO → ₪2,200
        • BND → ₪400
        • ת"א 125 → ₪600
        • REIT ETF → ₪800
        Total: ₪4,000 ✅

        Confirm? (yes / no)"

User:  "yes"

Bot:   "✅ All 4 transactions logged. Portfolio updated."
```

#### Scheduling a WhatsApp Message via Chat

```
User:  "Send me a portfolio summary every Sunday at 9am"

Bot:   "I'll set up this scheduled message:
        • Type: Portfolio Summary
        • Frequency: Weekly
        • Day: Sunday
        • Time: 9:00am (Asia/Jerusalem)

        Confirm? (yes / no)"

User:  "yes"

Bot:   "✅ Done! You'll receive a WhatsApp portfolio summary every Sunday at 9:00am."
```

#### Context Injected Per Session

Every chatbot session injects:
- Full current holdings (symbol, quantity, value, P&L)
- Target allocation vs current (gaps per position)
- Risk profile (level + time horizon + goal)
- Monthly investment range
- Enabled tracks
- Latest AI recommendations
- Today's top movers in portfolio

#### UI

- Floating chat button on all pages (bottom right)
- Slide-in panel — does not navigate away from current page
- Conversation history persisted per session
- Markdown rendering (tables, bold, bullet points)
- Action confirmations styled differently from regular messages (highlighted card)
- "Clear conversation" button

---

### 5.9 Watchlist

**Description:** User adds symbols to track. AI performs deep analysis on demand
and returns a buy/wait signal.

#### Watchlist Table

| Column | Notes |
|--------|-------|
| Symbol + Name | With logo |
| Current Price | Live |
| 24h Change % | Color coded |
| P/E, PEG, D/E, FCF | Live |
| Signal | ✅ Good Buy Now / ⏳ Not Yet / 🕐 Wait — after analysis only |
| AI Summary | One-liner — after analysis only |
| Actions | Analyze / Add to Portfolio / Ask AI / Set Alert / Remove |

#### AI Signal Output
```
✅ Good Buy Now   — Strong fundamentals, fits user's gaps
⏳ Not Yet        — Weak fundamentals, not ready
🕐 Wait for Dip  — Good company, wait for better price
```

#### Watchlist → Action Flow
- **"Add to Portfolio"** → pre-fills transaction entry
- **"Ask AI"** → opens chatbot with stock pre-loaded as context
- **"Set Alert"** → creates a price alert

---

### 5.10 Alerts & Notifications

**Alert Types:**
- Price above/below threshold
- Options position within 7 days of expiry
- Position drifts more than user-configured % from target

**Sources:** Created from app UI, chatbot, or WhatsApp bot.

**Logic:** Checked every 5 minutes via Spring scheduled job.
Once triggered → marked inactive until user re-enables.

**Channels:**
- In-app notification badge
- WhatsApp message (if enabled)

---

### 5.11 Performance Analytics

| Metric | Description |
|--------|-------------|
| Total Return | All-time P&L (realized + unrealized) |
| Realized P&L | From closed positions |
| Unrealized P&L | From open positions |
| ROI % | Return on total invested capital |
| Allocation Accuracy | How closely current tracks user's own targets |
| Best/Worst Performer | |
| Win Rate | % of closed trades that were profitable |
| Avg. Hold Duration | |

#### Benchmark Comparison
- vs S&P 500 (SPY) always shown
- Additional benchmarks selectable by user

#### Charts
- P&L by position, monthly returns, target vs actual allocation over time

---

### 5.12 Risk Management

| Metric | Description |
|--------|-------------|
| Concentration Risk | % in single position |
| Allocation Drift | Current vs user's own targets |
| Sector Exposure | % per sector |
| Geographic Exposure | By region |
| Volatility Score | Weighted avg beta |

#### Warnings (thresholds configurable by user in Settings)
- ⚠️ Single position exceeds user-configured limit
- ⚠️ Position drifts more than user-configured % from target
- ⚠️ Portfolio not rebalanced in more than user-configured period

---

### 5.13 WhatsApp Bot ⭐ Full Action Capabilities

**Description:** A natural language interface to the entire platform via WhatsApp,
powered by Twilio. Covers the same full action set as the in-app chatbot.

#### Two Modes (same as chatbot)

**Read mode** — instant response:
- "How is my portfolio?"
- "What's my VOO allocation?"
- "Show my top performers"
- "Analyze Elbit"
- "What's on my watchlist?"

**Write mode** — always confirm before executing:
- "I want to invest ₪5,000 this month"
- "Buy 10 shares of VOO"
- "Alert me when Elbit drops below ₪300"
- "Add Tesla to my watchlist"
- "Send me a weekly summary every Sunday at 9am"

#### Confirmation Flow
Identical to chatbot — user must reply "yes" to execute.
Pending confirmations expire after 5 minutes.

#### Session Management
- New session starts after 30 minutes of inactivity
- Full conversation history maintained per session for context

#### Message Format
WhatsApp messages use plain text with emoji for visual hierarchy —
no markdown (WhatsApp doesn't render it).

```
📊 *Portfolio Summary*
Total Value: ₪245,300
Daily Change: +₪1,240 (+0.51%) 📈
P&L All-Time: +₪45,300 (+22.7%)

Top Holdings:
• VOO — ₪112,000 (45.7%) ✅
• VXUS — ₪48,000 (19.6%) ✅
• REIT — ₪26,000 (10.6%) ✅
• BND — ₪24,000 (9.8%) ✅
```

---

### 5.14 Scheduled WhatsApp Messages

**Description:** User creates scheduled messages from Settings or via chatbot/WhatsApp.
All scheduling preferences are user-defined — nothing hardcoded.

#### What the User Configures Per Schedule

| Setting | Options |
|---------|---------|
| Content type | Portfolio Summary / Performance Report / Allocation Check / Investment Reminder / Top Movers |
| Custom label | Free text e.g. "Sunday check-in" |
| Frequency | Weekly / Biweekly / Monthly |
| Day (weekly/biweekly) | Any day of the week |
| Week cycle (biweekly) | Week 1 or Week 2 |
| Date (monthly) | Any date 1–28 |
| Time | Any time (HH:MM) |

#### Multiple Schedules Allowed
The user can create as many schedules as they want simultaneously. Examples:
- Weekly portfolio summary every Sunday at 9:00am
- Monthly performance report on the 1st at 8:00am
- Biweekly investment reminder every other Monday at 7:30am

#### Managing Schedules
- View all active schedules in Settings
- Toggle individual schedules on/off
- Edit any schedule
- Delete any schedule
- Full send history per schedule

#### Scheduler Logic (backend)
- Spring `@Scheduled` job runs every minute
- Reads `upcoming_scheduled_messages` view
- For each schedule where `next_send_at <= NOW()`:
  - Generates the message content via Claude API
  - Sends via Twilio
  - Updates `last_sent_at`, computes and saves `next_send_at`
  - Logs to `whatsapp_scheduled_message_log`

#### Message Content Generation
Each scheduled message type is generated by Claude with full portfolio context:

```
PORTFOLIO_SUMMARY     → Total value, P&L, daily change, top holdings, allocation health
PERFORMANCE_REPORT    → P&L breakdown, benchmark comparison, win rate, best/worst performer
ALLOCATION_CHECK      → Current vs target per position, drift warnings, rebalance suggestions
INVESTMENT_REMINDER   → "You haven't invested this month yet. Here's your suggested allocation."
TOP_MOVERS           → Biggest gainers and losers in portfolio this week
```

---

### 5.15 Import & Export

#### Import
- CSV and Excel (.xlsx) supported
- Column mapping UI
- Validation preview before confirming
- Error reporting per row

#### Export
- Holdings as CSV or Excel
- Full transaction history as CSV or Excel
- P&L performance report as CSV or Excel

---

### 5.16 Daily Snapshot Job & Catch-Up System

#### Daily Snapshot Job
- Runs every day at midnight via Spring `@Scheduled`
- Computes total portfolio value in user's preferred currency
- Saves one `portfolio_snapshot` record

#### Catch-Up Job (On Startup)
- Checks date of most recent snapshot on every startup
- If gap detected → fetches historical prices and fills missing snapshots
- Ensures chart shows no gaps even after downtime

---

## 6. External APIs

| API | Purpose | Notes |
|-----|---------|-------|
| Yahoo Finance (yfinance) | Real-time + historical prices | Free, no key — primary |
| Polygon.io | US stocks, options chain data | Free tier limited; paid for Greeks |
| Alpha Vantage | Backup market data | 25 calls/day free |
| Anthropic Claude API | All AI features | Pay per token |
| Twilio WhatsApp API | Inbound + outbound WhatsApp | Pay per message |

### API Priority for Price Data
Yahoo Finance → Polygon.io → Alpha Vantage (fallback chain)

> **Important:** Yahoo Finance is unofficial and can break without notice.
> Always keep Polygon.io as a ready fallback.

---

## 7. Design System

### Theme
- Dark Mode and Light Mode — user preference saved in `user_profile`
- Default: Dark Mode

### Color Palette

| Token | Dark Mode | Light Mode | Usage |
|-------|-----------|------------|-------|
| bg-primary | #0A0A0F | #F5F7FA | Page background |
| bg-card | #13131A | #FFFFFF | Cards and panels |
| accent-green | #00FF87 | #00C96B | Profit, on-target |
| accent-red | #FF3B5C | #E02B4B | Loss, overweight |
| accent-yellow | #FFD60A | #E6C000 | Slightly off target |
| accent-purple | #6C63FF | #5A52E0 | AI features, chatbot |
| text-primary | #FFFFFF | #0A0A0F | Main text |
| text-secondary | #8888AA | #666680 | Labels, subtitles |

### Typography

| Role | Font | Notes |
|------|------|-------|
| Display / Headings | Syne | Bold, modern |
| Body | Inter | Clean, readable |
| Numbers / Data | JetBrains Mono | Monospace for alignment |

### Animation Principles (Framer Motion)

- **Page transitions** — fade + slide in on route change
- **Number counters** — animate from 0 to value on load
- **Chart draw-in** — lines animate on first render
- **Card hover** — subtle glow + lift
- **Skeleton loaders** — shimmer while loading
- **Monthly flow cards** — stagger in one by one
- **Running total** — smooth transition as user adjusts amounts
- **Chatbot messages** — slide in from bottom as they appear
- **Confirmation cards** — pulse animation to draw attention

---

## 8. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Dashboard load time | Under 2 seconds |
| Monthly Investment Flow load | Under 5 seconds (includes AI calls) |
| Chatbot response time | Under 3 seconds |
| WhatsApp bot response time | Under 5 seconds |
| Scheduled message delivery | Within 1 minute of scheduled time |
| API response time | Under 500ms (p95) |
| Snapshot job reliability | 99.5% success rate |
| Local deployment | Single command startup |
| Future server migration | Zero code changes (env vars only) |
| Hardcoded user data | Zero — all values from database |

---

## 9. Build Order (Recommended)

| Phase | Features | Value Delivered |
|-------|---------|-----------------|
| **Phase 1** | Onboarding + Transaction Entry | User profile and target allocation configured |
| **Phase 2** | Dashboard | Portfolio visible and tracked |
| **Phase 3** | Monthly Investment Flow (math only, no AI) | Core question answered |
| **Phase 4** | AI summaries in Monthly Flow | Smarter monthly decisions |
| **Phase 5** | Watchlist + AI Analysis | Pre-buy research |
| **Phase 6** | AI Recommendation Engine | Proactive suggestions |
| **Phase 7** | Chatbot (read mode first) | Natural language Q&A |
| **Phase 8** | Chatbot write actions + confirmation flow | Full chatbot capability |
| **Phase 9** | WhatsApp bot (read mode first) | Portfolio via WhatsApp |
| **Phase 10** | WhatsApp write actions + confirmation flow | Full WhatsApp capability |
| **Phase 11** | Scheduled WhatsApp messages | Automated portfolio updates |
| **Phase 12** | Performance Analytics + Risk Management | Deep portfolio insights |
| **Phase 13** | Options Trading | Advanced positions |

> **Key insight on chatbot:** Build read mode first (Phase 7), get it working well,
> then add write actions (Phase 8). Don't try to build both at once.

---

## 10. Future Features

- **Tax report export** — Annual P&L for user's local tax rules
- **Keren Hishtalmut tracker** — Track tax-advantaged vehicle alongside broker account
- **Multi-currency support** — Live conversion between holdings and display currency
- **Broker sync** — If brokers open APIs in the future
- **Mobile app** — React Native version
- **Portfolio simulation** — "What if I invested X more per month?" modeling
- **Compounding calculator** — Projection tool based on actual portfolio + contributions
- **Voice commands** — WhatsApp voice note → transcribed → processed as text intent

---

*End of Document — v1.4*
