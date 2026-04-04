# Phase 9 — Options Trading

**Goal:** Track options positions alongside stocks. Only visible if user enabled the Options track during onboarding. Includes options-specific transaction entry, live P&L, Greeks display, and AI strategy suggestions.

**Prerequisite:** Phase 8 complete. Only build this if the user has OPTIONS enabled in `tracks_enabled`.

**Status:** ⬜ Not started

---

## Backend Tasks

### Options Transaction CRUD
- [ ] `GET /api/options` — return all options transactions (active + closed)
- [ ] `POST /api/options` — log a new options transaction
- [ ] `PUT /api/options/{id}/status` — update status (EXPIRED / EXERCISED / CLOSED)
- [ ] `DELETE /api/options/{id}` — remove an options record
- [ ] `OptionsTransactionRepository` — jOOQ queries for options_transactions table
- [ ] `OptionsTransactionService` — orchestration + validation

### Options Market Data
- [ ] `OptionsMarketDataService` — fetch live options data from Polygon.io (paid tier for Greeks)
  - current premium per contract
  - Delta, Theta, Vega, Gamma
  - implied volatility (IV) and IV Rank
- [ ] `OptionsQuote` domain model — underlying, strike, expiry, type, premium, greeks

### Options P&L Calculation
- [ ] `OptionsPnlCalculator` — pure function:
  - P&L = (current premium - entry premium) × contracts × 100
  - handles both long (BUY) and short (SELL) positions
  - marks EXPIRED positions at $0
- [ ] `DaysToExpiryCalculator` — compute days remaining from expiration_date

### Options Agent Integration
- [ ] `POST /api/options/{symbol}/strategy` — suggest options strategy for a held position
- [ ] `OptionsAgentService` — calls Claude with `options` agent prompt
  - input: position details, IV data, earnings date, user risk level
  - output: strategy suggestion (covered call / protective put / etc.)
  - only suggests strategies allowed for user's risk level (see agent rules)

### Alerts for Expiry
- [ ] Expiry alert auto-created when options position is logged with < 7 days to expiry
- [ ] Alert scheduler checks for positions approaching expiry (7 days)

---

## Frontend Tasks

### Options Section in Dashboard
- [ ] Options section shown only if user has OPTIONS track enabled
- [ ] `OptionsDashboardSection` — separate section below main holdings table
- [ ] `OptionsPositionsTable` — columns from PRD §5.7:
  - symbol (underlying + strike + expiry)
  - type (CALL / PUT badge)
  - contracts
  - premium paid (total cost)
  - current premium (live)
  - P&L (USD + %)
  - days to expiry (red when < 7)
  - Delta
  - status (Active / Expired / Exercised)

### Options Transaction Form
- [ ] `OptionsTransactionFormPage` — separate form for options entry
- [ ] Fields: underlying symbol, option type, action, strike price, expiration date, contracts, premium per contract
- [ ] `ExpiryDatePicker` — date picker with warning if < 14 days (earnings risk)

### Options Strategy Panel
- [ ] `OptionsStrategyButton` — "Get AI Strategy" for any held stock position
- [ ] `OptionsStrategyPanel` — shows AI strategy suggestion:
  - strategy name
  - contract details (type, strike, expiry, premium, total income, max loss, breakeven)
  - Greeks
  - IV analysis
  - earnings warning if applicable
  - reasoning text

### API Client
- [ ] `api/options.ts` — CRUD + strategy endpoint

---

## Validation Checklist

- [ ] Options section is completely hidden if user does not have OPTIONS track enabled
- [ ] P&L calculated correctly for both long and short options positions
- [ ] EXPIRED status automatically reduces P&L to total premium paid (loss = 100%)
- [ ] Days to expiry turns red at < 7 days
- [ ] AI strategy never suggests naked calls or puts (enforced by agent rules)
- [ ] Conservative users only see covered calls and protective puts
- [ ] Earnings warning shown when suggesting short options near earnings date
- [ ] Greeks display correctly (Polygon.io paid tier required — show unavailable message if not configured)
