# Phase 2 — Dashboard

**Goal:** User can see their full portfolio state at a glance — live prices, P&L, allocation health, and historical chart.

**Prerequisite:** Phase 1 complete. User has a profile, target allocations, and at least one transaction.

**Status:** ⬜ Not started

---

## Database

No new migrations needed.

New migration only if adding indexes for dashboard query performance:
- [ ] Consider index on `transactions(symbol, executed_at)` — already in V1
- [ ] Consider index on `portfolio_snapshots(date DESC)` — already in V1

---

## Backend Tasks

### Market Data Integration
- [ ] `MarketDataService` — interface with fallback chain: Yahoo Finance → Polygon.io → Alpha Vantage
- [ ] `YahooFinanceAdapter` — fetch current price, P/E, PEG, D/E, FCF for a symbol
- [ ] `PolygonAdapter` — fallback for US equities
- [ ] `AlphaVantageAdapter` — last-resort fallback
- [ ] `PriceQuote` domain model — symbol, price, currency, timestamp, source
- [ ] In-memory cache — cache prices for 60 seconds to avoid hammering APIs on page load

### Portfolio Summary
- [ ] `GET /api/portfolio/summary` — return:
  - total portfolio value (in user's preferred currency)
  - total P&L absolute + percentage
  - daily change absolute + percentage
  - allocation health score (average drift from targets)
- [ ] `PortfolioSummaryService` — load holdings, fetch prices, compute totals
- [ ] `PortfolioCalculator` — pure: holdings + prices → total value, P&L, daily change

### Holdings with Live Prices
- [ ] `GET /api/portfolio/holdings` — return per-symbol:
  - symbol, label (from target_allocations), track
  - target %, current %, status (ON_TARGET / SLIGHTLY_OFF / NEEDS_REBALANCING)
  - quantity, avg buy price, current price, current value
  - P&L absolute + percentage
- [ ] `HoldingsDashboardService` — merge derived holdings + live prices + target allocations
- [ ] `AllocationStatusCalculator` — pure: current % vs target % → status + drift

### Historical Chart Data
- [ ] `GET /api/portfolio/history?range=1W|1M|3M|6M|1Y|ALL` — return date + total_value array from `portfolio_snapshots`
- [ ] `SnapshotRepository` — query snapshots by date range

### Snapshot Jobs
- [ ] `DailySnapshotScheduler` — runs at midnight via `@Scheduled(cron = "0 0 0 * * *")`
- [ ] `CatchUpJob` — runs on startup (`@EventListener(ApplicationReadyEvent)`)
- [ ] `SnapshotService` — create snapshot for a given date (idempotent — skip if exists)
- [ ] `CatchUpService` — compute missing dates, fetch historical prices, create snapshots

---

## Frontend Tasks

### Dashboard Page
- [ ] `DashboardPage` — main layout: summary → holdings table → chart
- [ ] `useDashboard` hook — fetch summary, holdings, history in parallel

### Portfolio Summary Section
- [ ] `PortfolioSummaryCard` — total value, P&L, daily change, allocation health
- [ ] `AllocationHealthBadge` — green/yellow/red indicator
- [ ] `InvestThisMonthButton` — prominent CTA → navigates to monthly flow

### Holdings Table
- [ ] `HoldingsTable` — sortable table with all columns from PRD §5.4
- [ ] `HoldingRow` — one row per position
- [ ] `AllocationStatusBadge` — 🟢 On target / 🟡 Slightly off / 🔴 Needs rebalancing
- [ ] `PnlCell` — P&L value with green/red color + percentage

### Historical Chart
- [ ] `PortfolioHistoryChart` — TradingView Lightweight Charts line chart
- [ ] `TimeframeSelector` — 1W / 1M / 3M / 6M / 1Y / All buttons
- [ ] `usePortfolioHistory` hook — fetch history on timeframe change

### Layout + Shell
- [ ] `AppLayout` — sidebar or top nav, page wrapper
- [ ] `Navbar` — app name, nav links, theme toggle
- [ ] `ThemeToggle` — dark/light mode, persists to user_profile

### API Client
- [ ] `api/portfolio.ts` — summary, holdings, history endpoints

---

## Validation Checklist

- [ ] Dashboard loads in under 2 seconds
- [ ] Holdings P&L matches manual calculation from transactions + current price
- [ ] Current % allocations sum to 100% (within rounding)
- [ ] Allocation status (ON_TARGET / SLIGHTLY_OFF / NEEDS_REBALANCING) is correct at 0%, 5%, 10%+ drift thresholds
- [ ] Chart shows correct date range for each timeframe selector
- [ ] Snapshot catch-up job runs on startup and fills missing dates
- [ ] Daily snapshot job creates exactly one row per day (idempotent on re-run)
- [ ] Empty state shown when no transactions exist yet
