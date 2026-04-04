# Product Requirements Document (PRD)

## Personal Investment Portfolio Platform

**Version:** 1.3
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
   - 5.1 Onboarding Flow ← First-run setup
   - 5.2 Portfolio Entry & Transaction Management
   - 5.3 **Monthly Investment Flow** ← Core Feature
   - 5.4 Dashboard
   - 5.5 AI Recommendation Engine & Sub-Agents
   - 5.6 Personalized Risk Profile
   - 5.7 Options Trading
   - 5.8 Chatbot
   - 5.9 Watchlist
   - 5.10 Alerts & Notifications
   - 5.11 Performance Analytics
   - 5.12 Risk Management
   - 5.13 Import & Export
   - 5.14 Daily Snapshot Job & Catch-Up System
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

- User enters their holdings and transactions manually.
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
| AI Chatbot | Anthropic Claude API | Portfolio-aware |
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
│   │   ├── scheduler/        # Snapshot + catch-up jobs
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

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| symbol | VARCHAR | Entered by user e.g. VOO, AAPL, BTC-USD |
| type | ENUM | BUY, SELL, SHORT, COVER |
| track | ENUM | LONG, SHORT, CRYPTO |
| quantity | DECIMAL | |
| price_per_unit | DECIMAL | Price at time of transaction |
| executed_at | TIMESTAMP | Date/time of trade |
| notes | TEXT | Optional user notes |

#### `target_allocations`

The user's desired portfolio allocation — defined by the user during onboarding and
editable at any time. The foundation of the Monthly Investment Flow.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| symbol | VARCHAR | User-entered symbol |
| asset_type | ENUM | ETF, STOCK, BOND, REIT, CRYPTO |
| target_percentage | DECIMAL | User-entered e.g. 45.0 for 45% |
| label | VARCHAR | User-friendly name, entered by user |
| updated_at | TIMESTAMP | |

> **Validation rule:** The sum of all `target_percentage` values must equal exactly 100%.
> The UI enforces this with a live percentage tracker and prevents saving until the total
> reaches 100%.

#### `user_profile`

All user-specific settings entered during onboarding. No default values — every field
is set by the user.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| display_name | VARCHAR | User's chosen name |
| preferred_currency | VARCHAR | User-selected e.g. ILS, USD, EUR |
| risk_level | ENUM | Set by user: CONSERVATIVE, MODERATE, AGGRESSIVE |
| time_horizon_years | INTEGER | User-entered |
| monthly_investment_min | DECIMAL | User-entered lower bound |
| monthly_investment_max | DECIMAL | User-entered upper bound |
| investment_goal | TEXT | User-entered description e.g. "Family wealth" |
| tracks_enabled | JSONB | Which tracks user wants: Long, Short, Crypto, Options |
| questionnaire_answers | JSONB | Raw onboarding questionnaire answers |
| ai_inferred_score | DECIMAL | 0.0–1.0, updated by AI over time |
| onboarding_completed | BOOLEAN | False until user completes full onboarding flow |
| last_updated | TIMESTAMP | |

#### `portfolio_snapshots`

Daily record of total portfolio value — powers all historical charts.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| date | DATE | One record per day |
| total_value | DECIMAL | In user's preferred currency |
| daily_pnl | DECIMAL | Profit/loss vs previous day |
| snapshot_source | ENUM | SCHEDULED, CATCHUP |

#### `alerts`

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| symbol | VARCHAR | |
| condition | ENUM | ABOVE, BELOW |
| threshold_price | DECIMAL | |
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
| executed_at | TIMESTAMP | |
| notes | TEXT | Optional |

---

## 5. Features & Requirements

---

### 5.1 Onboarding Flow

**Description:** A guided first-run setup that collects everything the app needs to
personalize the experience. The app detects if `onboarding_completed = false` and
redirects to this flow before showing any other screen.

**No user data is assumed or hardcoded. Everything comes from this flow.**

#### Step 1 — Welcome & Basic Info

- Display name
- Preferred currency (dropdown: ILS / USD / EUR / GBP / other)
- Brief explanation of what the app does

#### Step 2 — Investment Profile Questionnaire

Questions (user selects from options — no free text required):

| Question | Options |
|---------|---------|
| Investment experience | Beginner / Some experience / Experienced |
| Time horizon | 1–3 years / 3–10 years / 10–20 years / 20+ years |
| Monthly investment amount (min) | Free number input in preferred currency |
| Monthly investment amount (max) | Free number input in preferred currency |
| Reaction to 20% portfolio drop | Sell everything / Hold steady / Buy more |
| Primary investment goal | Free text (e.g. "Family wealth", "Retirement", "Passive income") |
| Tracks of interest | Multi-select: Long Stocks / Short Selling / Crypto / Options |

Output: `risk_level` computed from answers — CONSERVATIVE, MODERATE, or AGGRESSIVE,
saved to `user_profile`.

#### Step 3 — Target Allocation Setup

The user defines their target portfolio allocation. This is the most important step.

**UI:**
- Search and add any symbol (ETF, stock, REIT, bond, crypto)
- For each added symbol: enter a label and target percentage
- Live percentage tracker shows running total (must reach exactly 100% to proceed)
- Ability to remove or edit any row before confirming

**Example of what the UI looks like (not what values to enter):**

```
Symbol    Label              Target %
──────    ─────              ────────
[  ]      [              ]   [    ]%    ← user fills these in
[  ]      [              ]   [    ]%
[  ]      [              ]   [    ]%

Total: 85% ← turns green when it reaches 100%

[+ Add position]         [Continue →] ← disabled until total = 100%
```

**Validation:**
- Total must equal exactly 100%
- No duplicate symbols
- Each percentage must be > 0%
- Minimum 1 position required

#### Step 4 — Initial Holdings (Optional)

The user can enter their existing positions now, or skip and add them later.

Options:
- **Enter manually** — add symbol, quantity, average buy price, date
- **Import CSV** — upload existing transaction history
- **Skip for now** — start fresh, add transactions manually going forward

#### Step 5 — Confirmation

Summary of everything entered:
- Profile (name, currency, risk level, time horizon)
- Target allocation table
- Initial holdings count (or "Starting fresh")

On confirm: `onboarding_completed` set to `true`, user is redirected to dashboard.

#### Re-accessing Onboarding Settings

All onboarding settings are editable at any time via the **Settings** page:
- Edit profile and questionnaire answers
- Edit target allocation (with live 100% validation)
- Re-run risk questionnaire

---

### 5.2 Portfolio Entry & Transaction Management

**Description:** The user manually logs all buy/sell activity. Holdings are always
computed from the full transaction history — never stored as a separate snapshot.

#### Transaction Entry Fields

| Field | Required | Notes |
|-------|---------|-------|
| Symbol | Yes | Auto-complete from user's target allocations + free search |
| Transaction Type | Yes | BUY / SELL / SHORT / COVER |
| Track | Yes | Long / Short / Crypto |
| Quantity | Yes | Number of shares/units |
| Price Per Unit | Yes | Price at time of execution |
| Date & Time | Yes | Defaults to now |
| Notes | No | Optional memo |

#### Validation Logic

- Selling more shares than held → blocked with clear error
- Covering a short → reduces short exposure accordingly
- Holdings always computed as: sum(BUY quantities) - sum(SELL quantities)

---

### 5.3 Monthly Investment Flow ⭐ Core Feature

**Description:** The most important feature. Each month, the user enters how much they
want to invest. The system calculates exactly how much to put into each position to move
toward the user's own target allocation, fetches real financial metrics, and layers AI
reasoning on top.

This answers: **"I have [amount] to invest this month. What exactly should I buy?"**

The amount entered here is free-form — the user types whatever they want to invest
that specific month. It is NOT constrained to the min/max from their profile
(those are used for AI context only).

#### User Flow

1. User taps **"Invest This Month"** from the dashboard
2. User enters the investment amount for this month (free input, any amount)
3. System calculates current vs. target allocation gap per position
4. System fetches live financial metrics (P/E, PEG, D/E, FCF) per position
5. Claude generates a one-line AI summary per position
6. User sees a card per position with full context and an editable suggested amount
7. Running total shows how much of the monthly budget remains unallocated
8. User adjusts amounts freely then confirms
9. Confirmed allocations are logged as BUY transactions automatically

#### Gap Calculation Logic

All values derived from user's own data — no hardcoded assumptions:

```
Total Portfolio Value     = sum of (quantity × current_price) for all holdings
Target Value for Position = Total Portfolio Value × user's target_percentage
Current Value             = quantity_held × current_price
Gap                       = Target Value - Current Value

If Gap > 0  → UNDERWEIGHT → suggest investing
If Gap <= 0 → OVERWEIGHT  → suggest ₪0 (never suggest selling)
```

#### Suggested Allocation Logic

```
Total Positive Gap    = sum of all gaps where Gap > 0
Position Weight       = Position Gap / Total Positive Gap
Position Suggested    = Monthly Amount × Position Weight
```

User can freely override any suggested amount. Running total updates in real time.

#### Position Card Design

Each underweight position shows:

```
┌─────────────────────────────────────────────────────┐
│  [Symbol] — [Label from user's target allocation]   │
│  Target: X% │ Current: Y% │ Gap: Z% (underweight)   │
├─────────────────────────────────────────────────────┤
│  P/E        │  PEG        │  D/E       │  FCF        │
│  [value]    │  [value]    │  [value]   │  [value]    │
│  [🟢/🟡/🔴] │  [🟢/🟡/🔴] │ [🟢/🟡/🔴]│ [🟢/🔴]   │
├─────────────────────────────────────────────────────┤
│  💬 AI Summary                                      │
│  [Claude-generated text based on metrics + gap]     │
├─────────────────────────────────────────────────────┤
│  Suggested: [calculated amount in user's currency]  │
│  ┌─────────────────┐                                │
│  │  [editable]     │  ← user can change this        │
│  └─────────────────┘                                │
└─────────────────────────────────────────────────────┘
```

Overweight positions show a simplified card:

```
┌─────────────────────────────────────────────────────┐
│  [Symbol] — [Label]                                  │
│  Target: X% │ Current: Y% │ Gap: +Z% (overweight)   │
│  ✅ No action needed this month — Suggested: 0       │
└─────────────────────────────────────────────────────┘
```

#### Metric Signal Colors

| Metric | 🟢 Good | 🟡 Fair | 🔴 Caution |
|--------|--------|--------|-----------|
| P/E | < 15 | 15–30 | > 30 |
| PEG | < 1 | 1–2 | > 2 |
| D/E | < 1 | 1–2 | > 2 |
| FCF | Positive & growing | Positive flat | Negative |

#### AI Summary — Context Injected

Every Claude API call for a position summary includes:
- The user's risk level and time horizon (from `user_profile`)
- The user's investment goal (from `user_profile`)
- The current gap for this position (underweight/overweight by how much)
- Live financial metrics (P/E, PEG, D/E, FCF)
- The user's monthly investment range (for context on position sizing)

The AI summary must be portfolio-aware — it explains whether to add to THIS position
given THIS user's specific situation, not generic stock advice.

#### Running Total Footer (sticky)

```
Monthly Budget:    [user-entered amount]
Allocated so far:  [sum of all edited inputs]
Remaining:         [difference]          ← updates in real time
```

Footer turns red if user tries to allocate more than their monthly budget.

#### Confirmation Step

```
Confirm this month's investments:

  [Symbol 1]  → [amount]  (Buy ~X shares at market price)
  [Symbol 2]  → [amount]  (Buy ~X shares at market price)
  ...

  Total: [amount]

  [Cancel]  [Confirm & Log Transactions]
```

On confirmation: each line is logged as a BUY transaction in `transactions`.

---

### 5.4 Dashboard

**Description:** The main screen. All data shown here is derived from the user's own
transactions and their own target allocation. No values are assumed.

#### Portfolio Summary

- Total portfolio value (in user's preferred currency)
- Total P&L (absolute + percentage)
- Daily change with color indicator
- Allocation health: how close current allocation is to user's target
- **"Invest This Month"** button → launches Monthly Investment Flow

#### Holdings Table

| Column | Notes |
|--------|-------|
| Symbol | With company logo |
| Label | From user's target allocations |
| Track | Long / Short / Crypto badge |
| Target % | From user's `target_allocations` |
| Current % | Computed live from holdings |
| Status | 🟢 On target / 🟡 Slightly off / 🔴 Needs rebalancing |
| Quantity | |
| Avg. Buy Price | Computed from transactions |
| Current Price | Live from API |
| Current Value | Quantity × Current Price |
| P&L (USD) | |
| P&L (%) | Color coded |

#### Historical Portfolio Chart

- Line chart of total portfolio value over time
- Powered by `portfolio_snapshots`
- Timeframe selector: 1W / 1M / 3M / 6M / 1Y / All

---

### 5.5 AI Recommendation Engine & Sub-Agents

**Description:** A multi-agent system that actively analyzes markets and delivers
recommendations personalized to the user's own portfolio, their own target allocation
gaps, and their own risk profile.

#### Personalization Context — Always Injected First

The Orchestrator reads from the database and injects:

```
User Profile (from user_profile table):
- Risk level: [user's actual risk_level]
- Time horizon: [user's actual time_horizon_years] years
- Investment goal: [user's actual investment_goal]
- Monthly range: [user's monthly_investment_min] – [user's monthly_investment_max]
- Tracks enabled: [user's actual tracks_enabled]

Current Portfolio (derived from transactions):
- [Each holding: symbol, quantity, current value, P&L]

Allocation Gaps (derived from target_allocations vs holdings):
- [Each position: target %, current %, gap]

AI Instructions:
- Do NOT recommend positions the user is already overweight in
- Do NOT recommend assets that exceed the user's risk tolerance
- DO prioritize filling underweight positions per the user's target allocation
- Match the user's investment style (risk level + time horizon)
```

#### Sub-Agent Architecture

```
Orchestrator Agent
├── Reads user profile and portfolio from database
├── Injects full context into each sub-agent
├── Activates only sub-agents matching user's enabled tracks
└── Returns unified ranked recommendations

Sub-Agents (activated only if track is enabled by user):
├── Long Equity Agent   → Fundamentals, P/E, PEG, FCF, momentum
├── Short Agent         → Overvalued stocks, weak fundamentals
├── Crypto Agent        → On-chain metrics, sentiment, catalysts
└── Options Agent       → IV analysis, Greeks, strategy suggestions
```

#### Recommendation Card Output

| Element | Description |
|---------|-------------|
| Symbol + Name | Live |
| Agent Source | Which sub-agent produced this |
| Recommendation | BUY / HOLD / WAIT FOR BETTER PRICE |
| Current Price | Live |
| Target Price | AI-reasoned |
| Expected Return % | (Target - Current) / Current |
| Time Horizon | Matched to user's profile |
| P/E, PEG, D/E, FCF | With signal colors |
| AI Reasoning | 3–5 sentences: WHY, not just WHAT |
| Risk Level | Relative to user's own risk tolerance |
| Confidence Score | 0–100% |
| Portfolio Fit Note | Why this fits THIS user's gaps and goals |
| Supporting Sources | 2–3 real clickable links |

---

### 5.6 Personalized Risk Profile

**Description:** Set by the user during onboarding. Editable at any time from Settings.
The AI refines the inferred score over time based on actual behavior.

All fields come from the user — nothing is assumed or defaulted.

#### Profile Page

- Display current risk level with explanation of what it means
- Show AI reasoning for last score update
- Allow manual override at any time
- Link to re-run questionnaire
- History of risk score changes over time

#### AI Dynamic Updating

- AI recalculates `ai_inferred_score` periodically based on transaction patterns
- Score shifts are shown to the user with explanation
- User can always manually override

---

### 5.7 Options Trading

**Description:** Track options positions. Only visible if user enabled Options track
during onboarding.

#### Transaction Entry (Options)

| Field | Required | Notes |
|-------|---------|-------|
| Underlying Symbol | Yes | |
| Option Type | Yes | CALL / PUT |
| Action | Yes | BUY / SELL |
| Strike Price | Yes | |
| Expiration Date | Yes | |
| Number of Contracts | Yes | 1 contract = 100 shares |
| Premium Per Contract | Yes | |

#### Dashboard Display

| Column | Notes |
|--------|-------|
| Symbol | Underlying + strike + expiry |
| Type | CALL / PUT badge |
| Contracts | |
| Premium Paid | Total cost |
| Current Premium | Live |
| P&L (USD + %) | |
| Days to Expiry | Red when < 7 days |
| Delta | Live Greek |
| Status | Active / Expired / Exercised |

> **Note:** Live Greeks require Polygon.io paid tier for options chain data.

---

### 5.8 Chatbot

**Description:** An AI assistant fully aware of the user's actual portfolio data,
their own target allocation, and their own risk profile — all read from the database
at session start.

#### Context Injected Per Session (from database)

- User's display name and investment goal
- Full current holdings (symbol, quantity, value, P&L)
- Target allocation vs current allocation (gaps per position)
- Risk level and time horizon
- Monthly investment range
- Enabled tracks
- Latest recommendations from AI engine

#### Capabilities

- Questions about the user's specific positions
- Explaining current allocation gaps
- Analyzing specific stocks or ETFs
- Discussing market conditions
- Explaining financial concepts

#### UI

- Floating chat button on all pages (bottom right)
- Slide-in panel (no page navigation)
- Session history persisted
- Markdown rendering
- "Clear conversation" button

---

### 5.9 Watchlist

**Description:** User adds any symbols to a watchlist. On demand, AI performs deep
analysis using the same metrics as the Monthly Investment Flow.

#### Watchlist Table

| Column | Notes |
|--------|-------|
| Symbol + Name | With logo |
| Current Price | Live |
| 24h Change % | Color coded |
| P/E, PEG, D/E, FCF | Live metrics |
| Signal | ✅ Good Buy Now / ⏳ Not Yet / 🕐 Wait — after analysis only |
| AI Summary | One-line reasoning — after analysis only |
| Actions | Analyze / Add to Portfolio / Ask AI / Set Alert / Remove |

#### AI Signal Output

Signal is one of three:

```
✅ Good Buy Now    — Strong fundamentals, reasonable valuation, fits user's gaps
⏳ Not Yet         — Fundamentals ok but overvalued at current price
🕐 Wait for Dip   — Good company, but wait for better entry point
```

Full reasoning always shown alongside the signal.

#### Watchlist → Action Flow

- **"Add to Portfolio"** → pre-fills transaction entry with the symbol
- **"Ask AI"** → opens chatbot with this stock as context
- **"Set Alert"** → creates a price alert

---

### 5.10 Alerts & Notifications

**Alert Types:**
- Price goes above user-set threshold
- Price goes below user-set threshold
- Options position within 7 days of expiry
- Any position drifts more than 10% from user's target allocation

**Notification Channels (v1):**
- In-app notification badge
- Email (user configures email address in Settings)

**Logic:**
- Prices checked every 5 minutes via Spring scheduled job
- Once triggered, alert marked inactive until user re-enables

---

### 5.11 Performance Analytics

#### Metrics Displayed

| Metric | Description |
|--------|-------------|
| Total Return | All-time P&L (realized + unrealized) |
| Realized P&L | From closed positions |
| Unrealized P&L | From open positions |
| ROI % | Return on total invested capital |
| Allocation Accuracy | How closely current allocation tracks user's own targets |
| Best Performer | Top gaining holding |
| Worst Performer | Top losing holding |
| Win Rate | % of closed trades that were profitable |
| Avg. Hold Duration | Average time positions held |

#### Benchmark Comparison

- Compare vs S&P 500 (SPY) — always shown
- Additional benchmarks selectable by user (any symbol can be used as benchmark)

#### Breakdown Charts

- P&L by position — horizontal bar chart
- Monthly returns — bar chart
- Target vs actual allocation over time — area chart

---

### 5.12 Risk Management

#### Risk Metrics

| Metric | Description |
|--------|-------------|
| Concentration Risk | % of portfolio in a single position |
| Allocation Drift | Current vs user's target allocation — delta per position |
| Sector Exposure | % per sector |
| Geographic Exposure | By region |
| Volatility Score | Weighted average beta |

#### Warnings (thresholds configurable by user in Settings)

- ⚠️ Single position exceeds user-configured concentration limit (default: 20%)
- ⚠️ Any position drifts more than user-configured drift limit from target (default: 10%)
- ⚠️ Portfolio not rebalanced in more than user-configured period (default: 6 months)

---

### 5.13 Import & Export

#### Import

- CSV and Excel (.xlsx) supported
- Column mapping UI — user maps their file's columns to app schema
- Validation preview before confirming
- Error reporting per row

#### Export

- Current holdings as CSV or Excel
- Full transaction history as CSV or Excel
- P&L performance report as CSV or Excel

---

### 5.14 Daily Snapshot Job & Catch-Up System

#### Daily Snapshot Job

- Runs every day at midnight via Spring `@Scheduled`
- Fetches current prices, computes total portfolio value in user's preferred currency
- Saves one `portfolio_snapshot` record
- Logs success/failure

#### Catch-Up Job (On Startup)

- Runs automatically on every application startup
- Checks date of most recent snapshot
- If gap detected: fetches historical prices for each missing day
- Creates missing snapshots with `snapshot_source = CATCHUP`

#### Example

```
App was offline: Jan 10 → Jan 13
App restarts on: Jan 14

Catch-up job:
  → Creates snapshot for Jan 10
  → Creates snapshot for Jan 11
  → Creates snapshot for Jan 12
  → Creates snapshot for Jan 13

Daily job creates Jan 14 snapshot at midnight. Chart shows no gaps. ✅
```

---

## 6. External APIs

| API | Purpose | Notes |
|-----|---------|-------|
| Yahoo Finance (yfinance) | Real-time + historical prices, ETF metrics | Free, no key — primary |
| Polygon.io | Real-time US stocks, options chain data | Free tier limited; paid for Greeks |
| Alpha Vantage | Backup market data | 25 calls/day free |
| Anthropic Claude API | All AI features | Pay per token |

### API Priority Strategy

Price data: Yahoo Finance → Polygon.io → Alpha Vantage (fallback chain)

> **Important:** Yahoo Finance is unofficial and can break without notice.
> Always keep Polygon.io as a ready fallback, not an afterthought.

---

## 7. Design System

### Theme

- Dark Mode and Light Mode with toggle (user preference saved in `user_profile`)
- Default: Dark Mode

### Color Palette

| Token | Dark Mode | Light Mode | Usage |
|-------|-----------|------------|-------|
| bg-primary | #0A0A0F | #F5F7FA | Page background |
| bg-card | #13131A | #FFFFFF | Cards and panels |
| accent-green | #00FF87 | #00C96B | Profit, on-target |
| accent-red | #FF3B5C | #E02B4B | Loss, overweight |
| accent-yellow | #FFD60A | #E6C000 | Slightly off target |
| accent-purple | #6C63FF | #5A52E0 | AI features |
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

---

## 8. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Dashboard load time | Under 2 seconds |
| Monthly Investment Flow load | Under 5 seconds (includes AI calls) |
| API response time | Under 500ms (p95) |
| Snapshot job reliability | 99.5% success rate |
| Local deployment | Single command startup |
| Future server migration | Zero code changes (env vars only) |
| Hardcoded user data | Zero — all values from database |

---

## 9. Build Order (Recommended)

| Phase | Features | Value Delivered |
|-------|---------|-----------------|
| **Phase 1** | Onboarding Flow + Transaction Entry | User profile and target allocation configured |
| **Phase 2** | Dashboard | Portfolio visible and tracked |
| **Phase 3** | Monthly Investment Flow (no AI yet) | Core question answered with math only |
| **Phase 4** | Add AI summaries to Monthly Flow | Smarter monthly decisions |
| **Phase 5** | Watchlist + AI Analysis | Pre-buy research |
| **Phase 6** | AI Recommendation Engine | Proactive suggestions |
| **Phase 7** | Chatbot | Natural language Q&A |
| **Phase 8** | Performance Analytics + Risk Management | Deep portfolio insights |
| **Phase 9** | Options Trading | Advanced positions |

> **Start with Phase 1.** The onboarding flow is now the foundation — nothing else
> works without user data. Get allocation math working before adding any AI.

---

## 10. Future Features

- **Tax report export** — Annual P&L formatted for the user's local tax rules
- **Keren Hishtalmut tracker** — Track tax-advantaged vehicle alongside broker account
- **Multi-currency support** — Live conversion between user's holdings currency and display currency
- **Push notifications** — Mobile-style alerts (requires PWA)
- **Broker sync** — If brokers open APIs in the future
- **Mobile app** — React Native version
- **Portfolio simulation** — "What if I invested X more per month?" scenario modeling
- **Compounding calculator** — Projection tool based on user's actual portfolio + contributions

---

*End of Document — v1.3*
