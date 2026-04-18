# Product Requirements Document (PRD)

## Personal Investment Portfolio Platform

**Version:** 1.5
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
   - 5.4 **Dashboard** ← Enhanced with 5 new widgets
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
| Dashboard answers every key question instantly | All 5 widgets load under 2 seconds |
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
│   │   ├── api/
│   │   ├── models/
│   │   ├── services/
│   │   ├── scheduler/
│   │   ├── whatsapp/
│   │   └── config/
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

---

## 4. Data Architecture

### Core Entities

#### `transactions`

Source of truth for all portfolio data. Holdings always derived from this table.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| symbol | VARCHAR | User-entered |
| type | ENUM | BUY, SELL, SHORT, COVER |
| track | ENUM | LONG, SHORT, CRYPTO |
| quantity | DECIMAL | |
| price_per_unit | DECIMAL | |
| total_value | DECIMAL | Generated: quantity × price_per_unit |
| source | VARCHAR | APP, CHATBOT, WHATSAPP, IMPORT |
| notes | TEXT | |
| executed_at | TIMESTAMP | |
| created_at | TIMESTAMP | |

#### `target_allocations`

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| symbol | VARCHAR | User-entered |
| asset_type | ENUM | ETF, STOCK, BOND, REIT, CRYPTO |
| target_percentage | DECIMAL | User-entered |
| label | VARCHAR | User-friendly name |
| display_order | INTEGER | |
| updated_at | TIMESTAMP | |

> Sum of all `target_percentage` must equal exactly 100%. Enforced by UI.

#### `user_profile`

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| display_name | VARCHAR | |
| preferred_currency | VARCHAR | |
| risk_level | ENUM | CONSERVATIVE, MODERATE, AGGRESSIVE |
| time_horizon_years | INTEGER | |
| monthly_investment_min | DECIMAL | |
| monthly_investment_max | DECIMAL | |
| investment_goal | TEXT | User's own words |
| tracks_enabled | JSONB | |
| questionnaire_answers | JSONB | |
| ai_inferred_score | DECIMAL | 0.0–1.0 |
| theme | VARCHAR | DARK or LIGHT |
| whatsapp_number | VARCHAR | |
| whatsapp_enabled | BOOLEAN | |
| timezone | VARCHAR | e.g. 'Asia/Jerusalem' |
| onboarding_completed | BOOLEAN | |

#### `portfolio_snapshots`

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| date | DATE | One per day (unique) |
| total_value | DECIMAL | |
| daily_pnl | DECIMAL | |
| daily_pnl_pct | DECIMAL | |
| snapshot_source | ENUM | SCHEDULED, CATCHUP |

#### `portfolio_health_snapshots`

Daily record of portfolio health score and its components.
Powers the health score trend chart on the dashboard.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| date | DATE | One per day (unique) |
| overall_score | INTEGER | 0–100 |
| allocation_score | INTEGER | 0–100 — component score |
| diversification_score | INTEGER | 0–100 — component score |
| performance_score | INTEGER | 0–100 — component score |
| activity_score | INTEGER | 0–100 — component score |
| score_breakdown | JSONB | Full detail per component |
| created_at | TIMESTAMP | |

#### `alerts`

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| symbol | VARCHAR | |
| condition | ENUM | ABOVE, BELOW |
| threshold_price | DECIMAL | |
| note | TEXT | |
| source | VARCHAR | APP, CHATBOT, WHATSAPP |
| is_active | BOOLEAN | |
| triggered_at | TIMESTAMP | |

#### `options_transactions`

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| underlying_symbol | VARCHAR | |
| option_type | ENUM | CALL, PUT |
| action | ENUM | BUY, SELL |
| strike_price | DECIMAL | |
| expiration_date | DATE | |
| contracts | INTEGER | |
| premium_per_contract | DECIMAL | |
| total_premium | DECIMAL | Generated column |
| status | ENUM | ACTIVE, EXPIRED, EXERCISED, CLOSED |

#### `whatsapp_scheduled_messages`

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| message_type | ENUM | PORTFOLIO_SUMMARY, PERFORMANCE_REPORT, ALLOCATION_CHECK, INVESTMENT_REMINDER, TOP_MOVERS |
| label | VARCHAR | User's own label |
| frequency | ENUM | WEEKLY, BIWEEKLY, MONTHLY |
| day_of_week | INTEGER | 0=Sun–6=Sat. WEEKLY/BIWEEKLY only |
| biweekly_week | INTEGER | 1 or 2. BIWEEKLY only |
| day_of_month | INTEGER | 1–28. MONTHLY only |
| send_time | TIME | |
| is_active | BOOLEAN | |
| last_sent_at | TIMESTAMP | |
| next_send_at | TIMESTAMP | |
| send_count | INTEGER | |

#### `whatsapp_conversations`

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| session_id | UUID | Groups messages into one conversation |
| direction | VARCHAR | INBOUND or OUTBOUND |
| message_body | TEXT | |
| intent | ENUM | Parsed intent |
| intent_data | JSONB | Extracted entities |
| twilio_sid | VARCHAR | |

#### `whatsapp_pending_confirmations`

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| session_id | UUID | |
| intent | ENUM | |
| intent_data | JSONB | Full action ready to execute |
| confirmation_message | TEXT | |
| state | ENUM | AWAITING_CONFIRMATION, PROCESSING |
| expires_at | TIMESTAMP | 5 min from creation |
| resolved | BOOLEAN | |
| resolution | VARCHAR | CONFIRMED, CANCELLED, EXPIRED |

---

## 5. Features & Requirements

---

### 5.1 Onboarding Flow

**Description:** Guided first-run setup. App redirects here until
`onboarding_completed = true`. Zero hardcoded values — everything from the user.

#### Step 1 — Welcome & Basic Info
- Display name, preferred currency, timezone

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
- Search and add any symbol
- Enter label and target percentage per position
- Live tracker must reach exactly 100% to proceed

#### Step 4 — Initial Holdings (Optional)
- Enter manually, import CSV, or skip

#### Step 5 — WhatsApp Setup (Optional)
- Enter number, enable bot — configurable later in Settings

#### Step 6 — Confirmation
All settings editable at any time via Settings page.

---

### 5.2 Portfolio Entry & Transaction Management

**Description:** User manually logs all buy/sell activity. Holdings computed from
full transaction history.

| Field | Required | Notes |
|-------|---------|-------|
| Symbol | Yes | Auto-complete + free search |
| Transaction Type | Yes | BUY / SELL / SHORT / COVER |
| Track | Yes | Long / Short / Crypto |
| Quantity | Yes | |
| Price Per Unit | Yes | |
| Date & Time | Yes | Defaults to now |
| Notes | No | |

---

### 5.3 Monthly Investment Flow ⭐ Core Feature

**Description:** User enters monthly investment amount. System calculates gaps,
fetches metrics, generates AI summaries. User adjusts and confirms.

#### Gap Calculation Logic

```
Total Portfolio Value     = sum of (quantity × current_price)
Target Value for Position = Total Portfolio Value × target_percentage
Current Value             = quantity_held × current_price
Gap                       = Target Value - Current Value

Gap > 0  → UNDERWEIGHT → suggest investing
Gap <= 0 → OVERWEIGHT  → suggest 0 (never suggest selling)
```

#### Suggested Allocation

```
Total Positive Gap    = sum of all positive gaps
Position Weight       = Position Gap / Total Positive Gap
Position Suggested    = Monthly Amount × Position Weight
```

#### Position Card

```
┌─────────────────────────────────────────────────────┐
│  [Symbol] — [User's label]                          │
│  Target: X% │ Current: Y% │ Gap: Z% (underweight)   │
├─────────────────────────────────────────────────────┤
│  P/E  🟢/🟡/🔴 │ PEG 🟢/🟡/🔴 │ D/E 🟢/🟡/🔴 │ FCF 🟢/🔴 │
├─────────────────────────────────────────────────────┤
│  💬 AI Summary (portfolio-aware)                    │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────┐                                │
│  │  [editable ₪]   │                                │
│  └─────────────────┘                                │
└─────────────────────────────────────────────────────┘
```

Sticky footer: `Budget | Allocated | Remaining` — turns red if over budget.
Confirmation step before logging transactions.

---

### 5.4 Dashboard ⭐ Enhanced

**Description:** The main screen — the first thing the user sees every day.
Enhanced with 5 new widgets that answer every key portfolio question at a glance.
All data derived entirely from the user's own transactions and target allocation.

#### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  🔔 Smart Alerts Strip                                          │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│  Total Value │  Daily P&L   │  All-time    │  Health Score      │
│  & Summary   │  & Change    │  P&L         │  Widget            │
├──────────────┴──────────────┴──────────────┴────────────────────┤
│  This Month Panel                │  Benchmark Comparison Widget  │
├──────────────────────────────────┴──────────────────────────────┤
│  Compounding Projection Widget                                   │
├─────────────────────────────────────────────────────────────────┤
│  Holdings Table                                                  │
├─────────────────────────────────────────────────────────────────┤
│  Historical Portfolio Chart                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

#### Widget 1 — Portfolio Health Score

**Purpose:** A single number (0–100) that tells the user instantly how healthy their
portfolio is. No need to read multiple metrics — one glance answers "Am I on track?"

**Score Calculation — 4 weighted components:**

| Component | Weight | What It Measures |
|-----------|--------|-----------------|
| Allocation Accuracy | 40% | How close current allocation is to user's own targets |
| Diversification | 25% | Spread across asset classes, geographies, sectors |
| Performance | 20% | Portfolio return vs S&P 500 benchmark over 3 months |
| Activity | 15% | Consistency of monthly contributions |

**Allocation Accuracy Score (40%):**
```
Per position drift = ABS(current_percent - target_percent)
Average drift = mean of all position drifts
Score = MAX(0, 100 - (average_drift × 10))

Example: average drift of 3% → score = 70
Example: average drift of 0% → score = 100 (perfect)
Example: average drift of 10%+ → score = 0
```

**Diversification Score (25%):**
```
Based on number of distinct asset types held vs user's target:
- All target asset types represented    → 100
- One asset type missing               → 75
- Two asset types missing              → 50
- Heavy concentration (1 position >40%)→ penalty -20
- No international exposure            → penalty -15
```

**Performance Score (20%):**
```
3-month portfolio return vs S&P 500 (SPY):
- Outperforming by >2%    → 100
- Matching ±2%            → 75
- Underperforming by 2–5% → 50
- Underperforming by >5%  → 25
```

**Activity Score (15%):**
```
Based on investment consistency over last 3 months:
- Invested all 3 months        → 100
- Invested 2 of last 3 months  → 66
- Invested 1 of last 3 months  → 33
- No investment in 3 months    → 0
```

**Final Score:**
```
Health Score = (Allocation × 0.40) + (Diversification × 0.25)
             + (Performance × 0.20) + (Activity × 0.15)
```

**Score Display:**

```
┌─────────────────────────────┐
│  Portfolio Health           │
│                             │
│         78 / 100            │
│       ████████░░  Good      │
│                             │
│  Allocation     85  🟢      │
│  Diversif.      90  🟢      │
│  Performance    60  🟡      │
│  Activity       66  🟡      │
│                             │
│  7-day trend: ↑ +3 pts      │
└─────────────────────────────┘
```

**Score Labels:**
| Range | Label | Color |
|-------|-------|-------|
| 85–100 | Excellent | 🟢 Green |
| 70–84 | Good | 🟢 Light green |
| 50–69 | Fair | 🟡 Yellow |
| 30–49 | Needs Attention | 🟠 Orange |
| 0–29 | Poor | 🔴 Red |

**Score History:**
- Saved daily to `portfolio_health_snapshots` table
- Shown as a sparkline trend (last 30 days)
- Clicking the widget opens a detailed breakdown page

**Recalculated:** Every time the dashboard loads + after every transaction.

---

#### Widget 2 — This Month Panel

**Purpose:** Answers "Have I invested this month yet?" instantly.
Drives consistent monthly contribution behaviour — the single most important
investing habit.

**Two States:**

**State A — Not yet invested this month:**
```
┌─────────────────────────────────────────┐
│  📅 This Month                          │
│                                         │
│  ⚠️  You haven't invested yet           │
│                                         │
│  Suggested this month:                  │
│  Based on your gaps:                    │
│  • VOO → underweight 5%                 │
│  • BND → underweight 2%                 │
│  • REIT → underweight 1%                │
│                                         │
│  [🚀 Invest Now]                        │
└─────────────────────────────────────────┘
```

The "Invest Now" button launches the Monthly Investment Flow pre-filled with
the user's monthly_investment_min as a starting amount.

**State B — Already invested this month:**
```
┌─────────────────────────────────────────┐
│  📅 This Month                          │
│                                         │
│  ✅  Invested on Apr 3                  │
│  Amount: ₪4,500                         │
│                                         │
│  Positions added:                       │
│  • VOO  +8 shares                       │
│  • BND  +12 shares                      │
│  • REIT +5 shares                       │
│                                         │
│  [📊 View Details]  [+ Add More]        │
└─────────────────────────────────────────┘
```

**Logic:**
- "This month" = current calendar month
- Check `monthly_investment_sessions` for any session in current month
- If found → State B. If not → State A.
- "Add More" → launches Monthly Investment Flow again (partial month top-up)

---

#### Widget 3 — Benchmark Comparison

**Purpose:** Shows clearly whether the user's portfolio is beating or lagging the
S&P 500. The most important performance context for any long-term investor.

**Display:**

```
┌──────────────────────────────────────────────┐
│  📈 vs S&P 500                               │
│                                              │
│  Timeframe: [1M] [3M] [6M] [1Y] [All]       │
│                                              │
│  Your Portfolio    +12.4%  ████████████      │
│  S&P 500 (SPY)     +9.8%   █████████         │
│                                              │
│  You're beating the market by +2.6% 🟢       │
│                                              │
│  [Last updated: live]                        │
└──────────────────────────────────────────────┘
```

**When underperforming:**
```
│  Your Portfolio    +5.2%   █████             │
│  S&P 500 (SPY)     +9.8%   █████████         │
│                                              │
│  Lagging the market by -4.6% 🔴              │
```

**Timeframe Options:** 1M / 3M / 6M / 1Y / All Time
- Default: 3 months
- User's last selected timeframe persisted in localStorage

**Data Sources:**
- Portfolio performance: computed from `portfolio_snapshots`
- SPY performance: fetched from Yahoo Finance for same period

**Additional benchmark:** User can add a second benchmark from Settings
(e.g. ת"א 125 for Israeli market comparison). Optional, not required.

---

#### Widget 4 — Smart Alerts Strip

**Purpose:** A dismissible top banner that surfaces only what needs the user's
attention RIGHT NOW. Replaces having to check multiple pages for urgent items.

**Displayed as a horizontal strip at the very top of the dashboard.**

**Alert Types (priority order):**

| Priority | Alert | Example |
|----------|-------|---------|
| 🔴 Critical | Options expiring in ≤ 3 days | "AAPL $200C expires in 2 days" |
| 🔴 Critical | Price alert triggered | "VOO crossed above $450 ✅" |
| 🟠 High | Position drifted > 10% from target | "VOO is 55% — target is 45%" |
| 🟠 High | No investment this month (after 20th) | "You haven't invested in April yet" |
| 🟡 Medium | Options expiring in ≤ 7 days | "AAPL $200C expires in 5 days" |
| 🟡 Medium | Health score dropped > 10 pts | "Health score dropped from 82 to 71" |
| 🟢 Info | Monthly investment logged | "₪4,500 invested successfully" |

**Strip Design:**
```
┌─────────────────────────────────────────────────────────────────┐
│ 🔴 AAPL $200C expires in 2 days  |  🟠 VOO is 10% over target  │
│                                                        [✕ Dismiss]│
└─────────────────────────────────────────────────────────────────┘
```

- Multiple alerts shown side by side, scrollable horizontally
- Each alert is individually dismissible
- Dismissed alerts don't reappear until the underlying condition changes
- Clicking an alert navigates to the relevant page
- Strip is hidden entirely when there are no active alerts

**Alert Thresholds:**
- Drift threshold: configurable by user in Settings (default: 10%)
- "No investment" nudge day: configurable by user (default: 20th of month)
- Options warning window: configurable (default: 7 days)

---

#### Widget 5 — Compounding Projection

**Purpose:** Shows the user where their portfolio is headed if they keep their
current pace. Turns abstract compounding math into a personal, motivating projection.

**Inputs (all from user's actual data — nothing assumed):**
- Current portfolio value (live from holdings)
- Average monthly contribution (computed from last 6 months of `monthly_investment_sessions`)
- Assumed annual return: user-configurable in Settings (default: 8%)
- User's time horizon (from `user_profile`)

**Display:**

```
┌──────────────────────────────────────────────────────┐
│  💰 Compounding Projection                           │
│  Based on ₪4,200/month avg contribution at 8%/yr    │
│                                                      │
│  Today        ₪245,300                               │
│  5 years      ₪680,000   ████████                    │
│  10 years     ₪1,420,000 ████████████████            │
│  20 years     ₪3,800,000 ████████████████████████████│
│                                                      │
│  At this rate you reach ₪1M in: 13 years 4 months   │
│                                                      │
│  [⚙️ Adjust return assumption]                       │
└──────────────────────────────────────────────────────┘
```

**Key Calculations:**
```
Future Value = PV × (1 + r)^n + PMT × [((1 + r)^n - 1) / r]

Where:
PV  = current portfolio value
r   = monthly rate = annual_rate / 12
n   = months to project
PMT = average monthly contribution (from last 6 sessions, or min if < 6 sessions)
```

**Milestone Markers:**
The projection highlights when the user hits meaningful milestones:
- ₪500,000
- ₪1,000,000
- ₪2,000,000
- 25× annual expenses (financial independence — if user entered annual expenses in profile)

**Adjustable Assumptions:**
- User can change the assumed annual return (slider: 4% to 15%)
- User can change projected monthly contribution
- Changes update the chart in real time — nothing saved unless user clicks "Save as default"

**Motivation Line:**
A single sentence below the chart, generated by Claude, personalised to the user:

> "At your current pace, you'll reach financial independence in approximately
> 18 years — your daughters will be 20 and 22. Keep going. 💪"

This line is regenerated weekly, uses the user's investment goal from their profile,
and is aware of their actual trajectory.

---

#### Existing Dashboard Elements (unchanged)

**Portfolio Summary Bar:**
- Total portfolio value (user's currency)
- Total P&L (absolute + %)
- Daily change with color indicator
- "Invest This Month" button
- Chat button (opens chatbot)

**Holdings Table:**

| Column | Notes |
|--------|-------|
| Symbol + Logo | |
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

**Historical Portfolio Chart:**
- Line chart powered by `portfolio_snapshots`
- Timeframe: 1W / 1M / 3M / 6M / 1Y / All

---

### 5.5 AI Recommendation Engine & Sub-Agents

**Description:** Multi-agent system producing personalized recommendations based on
user's portfolio, gaps, and risk profile.

#### Context Always Injected
- Risk level, time horizon, goal (from `user_profile`)
- Holdings with P&L (from `transactions`)
- Allocation gaps (target vs current)
- Monthly investment range

#### Sub-Agent Architecture
```
Orchestrator
├── Long Equity Agent    (if LONG enabled)
├── Short Agent          (if SHORT enabled)
├── Crypto Agent         (if CRYPTO enabled)
├── Options Agent        (if OPTIONS enabled)
├── REIT Agent           (if REITs in portfolio or target)
└── Bond Agent           (if Bonds in portfolio or target)
```

#### Recommendation Card Output
- Symbol, recommendation (BUY / HOLD / WAIT), current + target price
- P/E, PEG, D/E, FCF with signal colors
- 3–5 sentence AI reasoning (WHY not just WHAT)
- Portfolio fit note
- Confidence score, risk level, supporting links
- Cached 15 minutes, manual refresh available

---

### 5.6 Personalized Risk Profile

Set during onboarding. Editable from Settings. AI refines score over time.
- Current risk level + explanation
- AI reasoning for last update
- Manual override available
- Score change history

---

### 5.7 Options Trading

Only visible if user enabled OPTIONS track.

**Transaction entry:** Underlying, CALL/PUT, BUY/SELL, strike, expiry, contracts, premium.

**Dashboard section:** Symbol, type, contracts, premium, P&L, days to expiry (red < 7),
delta, status.

---

### 5.8 AI Chatbot ⭐ Full Action Capabilities

**Description:** Portfolio-aware conversational assistant that can both answer questions
AND take actions. Every write action requires explicit confirmation.

#### Two Modes

**Read mode** — instant, no confirmation:
- Portfolio questions, allocation status, AI analysis, performance, concept explanations,
  watchlist signals, market conditions

**Write mode** — always confirm first:
- Log transactions, start Monthly Investment Flow, set price alerts,
  add/remove watchlist items, configure scheduled WhatsApp messages

#### Confirmation Flow

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

Pending actions expire after 5 minutes of no response.

#### Monthly Flow via Chat

```
User:  "I want to invest ₪4,000 this month"

Bot:   "Here's your suggested allocation for ₪4,000:
        • VOO → ₪1,800 (~8 shares) — underweight 5%
          P/E: 22 🟡 | FCF: Strong 🟢
          "Good month to add — near fair value."
        • BND → ₪800 — underweight 2%
        • ת"א 125 → ₪600 — underweight 1%
        • REIT → ₪800 — underweight 1%
        Total: ₪4,000

        Confirm all, or tell me what to adjust."

User:  "Increase VOO to ₪2,200, reduce BND to ₪400"

Bot:   "Updated — Total: ₪4,000 ✅
        Confirm? (yes / no)"

User:  "yes"
Bot:   "✅ All 4 transactions logged. Portfolio updated."
```

#### Context Injected Per Session
- Full holdings, P&L, target vs current gaps
- Risk profile, time horizon, goal
- Monthly investment range, enabled tracks
- Latest AI recommendations, today's top movers

#### UI
- Floating button all pages, slide-in panel
- Markdown rendering, conversation history per session
- Confirmation actions styled as highlighted cards with pulse animation
- "Clear conversation" button

---

### 5.9 Watchlist

User adds symbols to track. AI performs deep analysis on demand.

| Column | Notes |
|--------|-------|
| Symbol + Name | With logo |
| Current Price | Live |
| 24h Change % | |
| P/E, PEG, D/E, FCF | Live |
| Signal | ✅ Good Buy Now / ⏳ Not Yet / 🕐 Wait — after analysis |
| AI Summary | One-liner — after analysis |
| Actions | Analyze / Add to Portfolio / Ask AI / Set Alert / Remove |

---

### 5.10 Alerts & Notifications

**Types:** Price above/below, options expiry ≤ 7 days, allocation drift > threshold,
no monthly investment after user-configured date.

**Sources:** App UI, chatbot, WhatsApp bot.
**Channels:** In-app badge, WhatsApp (if enabled).
**Logic:** Checked every 5 min. Once triggered → inactive until re-enabled.

---

### 5.11 Performance Analytics

| Metric | Description |
|--------|-------------|
| Total Return | All-time P&L |
| Realized P&L | Closed positions |
| Unrealized P&L | Open positions |
| ROI % | Return on invested capital |
| Allocation Accuracy | vs user's own targets |
| Best / Worst Performer | |
| Win Rate | % of profitable closed trades |
| Avg. Hold Duration | |

Benchmark: vs S&P 500 always shown. Additional benchmarks user-selectable.

Charts: P&L by position, monthly returns, target vs actual over time.

---

### 5.12 Risk Management

| Metric | Description |
|--------|-------------|
| Concentration Risk | % in single position |
| Allocation Drift | Current vs targets |
| Sector Exposure | |
| Geographic Exposure | |
| Volatility Score | Weighted avg beta |

All warning thresholds configurable by user in Settings.

---

### 5.13 WhatsApp Bot ⭐ Full Action Capabilities

Natural language interface to the full platform via Twilio WhatsApp.
Same read/write capability as the in-app chatbot.

**Read:** Portfolio summary, position status, analysis, allocation, performance, watchlist.
**Write (confirm first):** Invest monthly, buy stock, log transaction, set alert,
add to watchlist, schedule a WhatsApp message.

Messages use plain text + emoji (no markdown — WhatsApp doesn't render it).
New session after 30 min inactivity. Pending confirmations expire after 5 min.

---

### 5.14 Scheduled WhatsApp Messages

Fully user-defined. Nothing hardcoded. Multiple schedules simultaneously.

**User configures per schedule:**
- Content type: Portfolio Summary / Performance Report / Allocation Check /
  Investment Reminder / Top Movers
- Custom label
- Frequency: Weekly / Biweekly / Monthly
- Day/time (user's local timezone from `user_profile`)

**Managed from:** Settings page OR via chatbot OR via WhatsApp.

**Scheduler:** Spring job runs every minute, checks `upcoming_scheduled_messages` view,
fires due messages via Twilio, logs to `whatsapp_scheduled_message_log`.

---

### 5.15 Import & Export

**Import:** CSV and Excel, column mapping UI, validation preview, error reporting.
**Export:** Holdings, transaction history, P&L report — as CSV or Excel.

---

### 5.16 Daily Snapshot Job & Catch-Up System

**Daily job:** Midnight — computes portfolio value, saves `portfolio_snapshot`.
Also computes and saves `portfolio_health_snapshot` with full score breakdown.

**Catch-up job:** On every startup — detects gaps in snapshots, fills from
historical price data. Chart always complete, no gaps.

---

## 6. External APIs

| API | Purpose | Notes |
|-----|---------|-------|
| Yahoo Finance | Real-time + historical prices | Free, no key — primary |
| Polygon.io | US stocks, options chain data | Paid for Greeks |
| Alpha Vantage | Backup market data | 25 calls/day free |
| Anthropic Claude API | All AI features + projection motivation line | Pay per token |
| Twilio WhatsApp API | Inbound + outbound WhatsApp | Pay per message |

Price fallback chain: Yahoo Finance → Polygon.io → Alpha Vantage.

---

## 7. Design System

### Theme
Dark / Light — user preference. Default: Dark.

### Color Palette

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| bg-primary | #0A0A0F | #F5F7FA | Background |
| bg-card | #13131A | #FFFFFF | Cards |
| accent-green | #00FF87 | #00C96B | Profit, on-target, excellent health |
| accent-red | #FF3B5C | #E02B4B | Loss, overweight, poor health |
| accent-yellow | #FFD60A | #E6C000 | Slightly off, fair health |
| accent-orange | #FF8C00 | #E67E00 | Needs attention health score |
| accent-purple | #6C63FF | #5A52E0 | AI features, chatbot |
| text-primary | #FFFFFF | #0A0A0F | |
| text-secondary | #8888AA | #666680 | Labels |

### Typography

| Role | Font |
|------|------|
| Headings | Syne |
| Body | Inter |
| Numbers | JetBrains Mono |

### Animation Principles (Framer Motion)

- Page transitions — fade + slide
- Number counters — animate 0 to value on load
- Chart draw-in — lines animate on first render
- Card hover — glow + lift
- Skeleton loaders — shimmer
- Monthly flow cards — stagger in
- Running total — smooth transition
- Chatbot messages — slide in from bottom
- Confirmation cards — pulse to draw attention
- Health score — circular fill animation on load
- Projection chart — bars grow from left to right on load
- Alerts strip — slides down from top on appearance

---

## 8. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Dashboard load | Under 2 seconds |
| All 5 widgets loaded | Under 3 seconds |
| Monthly Investment Flow | Under 5 seconds (includes AI) |
| Chatbot response | Under 3 seconds |
| WhatsApp bot response | Under 5 seconds |
| Scheduled message delivery | Within 1 minute of scheduled time |
| Health score calculation | Under 500ms |
| Projection calculation | Under 100ms (pure math, no API) |
| Snapshot reliability | 99.5% success rate |
| Local deployment | Single command |
| Hardcoded user data | Zero |

---

## 9. Build Order (Recommended)

| Phase | Features | Value Delivered |
|-------|---------|-----------------|
| **Phase 1** | Onboarding + Transaction Entry | Profile and allocation configured |
| **Phase 2** | Dashboard (basic) | Portfolio visible |
| **Phase 3** | Monthly Investment Flow (math only) | Core question answered |
| **Phase 4** | AI summaries in Monthly Flow | Smarter decisions |
| **Phase 5** | Dashboard — This Month Panel | Investment consistency habit |
| **Phase 6** | Dashboard — Compounding Projection | Motivation and long-term view |
| **Phase 7** | Dashboard — Benchmark Comparison | Performance context |
| **Phase 8** | Dashboard — Health Score | Portfolio quality at a glance |
| **Phase 9** | Dashboard — Smart Alerts Strip | Nothing urgent gets missed |
| **Phase 10** | Watchlist + AI Analysis | Pre-buy research |
| **Phase 11** | AI Recommendation Engine | Proactive suggestions |
| **Phase 12** | Chatbot (read mode) | Natural language Q&A |
| **Phase 13** | Chatbot (write actions) | Full chatbot capability |
| **Phase 14** | WhatsApp bot (read mode) | Portfolio via WhatsApp |
| **Phase 15** | WhatsApp bot (write actions) | Full WhatsApp capability |
| **Phase 16** | Scheduled WhatsApp messages | Automated updates |
| **Phase 17** | Performance Analytics + Risk Management | Deep insights |
| **Phase 18** | Options Trading | Advanced positions |

> **Dashboard widgets build order matters:** This Month → Projection → Benchmark →
> Health Score → Alerts. Each one is independently valuable and can ship separately.

---

## 10. Future Features

- **Tax report export** — Annual P&L for user's local tax rules
- **Keren Hishtalmut tracker** — Track tax-advantaged vehicle separately
- **Multi-currency support** — Live conversion
- **Broker sync** — If brokers open APIs
- **Mobile app** — React Native
- **Portfolio simulation** — "What if" scenario modeling
- **Voice commands** — WhatsApp voice note → intent → action
- **Annual review report** — Full year summary generated by Claude, sent via WhatsApp

---

*End of Document — v1.5*
