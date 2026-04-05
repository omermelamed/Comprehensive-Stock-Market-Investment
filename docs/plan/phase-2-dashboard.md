# Phase 2 — Dashboard

**Goal:** User can see their full portfolio state at a glance — live prices, P&L, allocation health, and historical chart.

**Prerequisite:** Phase 1 complete. User has a profile, target allocations, and at least one transaction.

**Status:** ✅ Complete

---

## Database

No new migrations needed.

- [x] Index on `transactions(symbol, executed_at)` — already in V1
- [x] Index on `portfolio_snapshots(date DESC)` — already in V1

---

## Backend Tasks

### Market Data Integration
- [x] `MarketDataService` — interface with fallback chain: Yahoo Finance → Polygon.io → Alpha Vantage
- [x] `YahooFinanceAdapter` — fetch current price for a symbol
- [x] `PolygonAdapter` — fallback for US equities (skips if `POLYGON_API_KEY` absent)
- [x] `AlphaVantageAdapter` — last-resort fallback (skips if `ALPHA_VANTAGE_API_KEY` absent)
- [x] `PriceQuote` domain model — symbol, price, currency, timestamp, source
- [x] In-memory cache — 60-second TTL via `ConcurrentHashMap` + `Clock`

### Portfolio Summary
- [x] `GET /api/portfolio/summary` — total value, P&L, cost basis, allocation health score, holding count
- [x] `PortfolioSummaryService` — load holdings, fetch prices, compute totals
- [x] `PortfolioCalculator` — pure: holdings + prices → total value, P&L, per-holding metrics

### Holdings with Live Prices
- [x] `GET /api/portfolio/holdings` — per-symbol: symbol, label, track, qty, avg buy, current price, current value, P&L, target%, current%, drift, status
- [x] `HoldingsDashboardService` — merged via `PortfolioSummaryService`
- [x] `AllocationStatusCalculator` — pure: abs drift ≤2% = ON_TARGET, ≤10% = SLIGHTLY_OFF, >10% = NEEDS_REBALANCING

### Historical Chart Data
- [x] `GET /api/portfolio/history?range=1W|1M|3M|6M|1Y|ALL` — returns date + totalValue array from portfolio_snapshots
- [x] `SnapshotRepository` — query snapshots by date range

### Snapshot Jobs
- [x] `DailySnapshotScheduler` — runs at midnight via `@Scheduled(cron = "0 0 0 * * *")`
- [x] `CatchUpJob` — runs on startup via `@EventListener(ApplicationReadyEvent)`
- [x] `SnapshotService` — create snapshot for a given date (idempotent — skip if exists)
- [x] `CatchUpService` — compute missing dates, create catch-up snapshots using current prices

---

## Frontend Tasks

### Dashboard Page
- [x] `DashboardPage` — composes summary card, holdings table, chart with stagger animation
- [x] `useDashboard` hook — fetches summary, holdings, history in parallel; range re-fetch on timeframe change

### Portfolio Summary Section
- [x] `PortfolioSummaryCard` — total value (monospace), P&L (signed, colored), cost basis, holding count
- [x] `AllocationHealthBadge` — green/yellow/red inline badge by drift score
- [x] `InvestThisMonthButton` — link to `/monthly-flow` (placeholder for Phase 3)

### Holdings Table
- [x] `HoldingsTable` — sortable table with all dashboard columns
- [x] `HoldingRow` — inline in table
- [x] `AllocationStatusBadge` — ON_TARGET/SLIGHTLY_OFF/NEEDS_REBALANCING/UNTRACKED
- [x] `PnlCell` — P&L value with green/red color + percentage

### Historical Chart
- [x] `PortfolioHistoryChart` — lightweight-charts line chart, responsive via ResizeObserver
- [x] `TimeframeSelector` — 1W / 1M / 3M / 6M / 1Y / ALL buttons
- [x] `usePortfolioHistory` — handled inside `useDashboard`

### Layout + Shell
- [x] `AppLayout` — sidebar (240px) + main content area with React Router Outlet
- [x] `Navbar` — sidebar nav with Dashboard and Transactions links, active state via NavLink
- [ ] `ThemeToggle` — dark/light mode toggle (deferred — design system tokens handle both modes)

### API Client
- [x] `api/portfolio.ts` — summary, holdings, history endpoints with full TypeScript types

---

## Validation Checklist

- [ ] Dashboard loads in under 2 seconds
- [x] Holdings P&L computed from transactions + current price
- [x] Current % allocations from totalPortfolioValue basis
- [x] Allocation status thresholds: ON_TARGET ≤2%, SLIGHTLY_OFF ≤10%, NEEDS_REBALANCING >10%
- [x] Chart range selector fetches correct date range
- [x] Snapshot catch-up job runs on startup
- [x] Daily snapshot job is idempotent (skip if date already has snapshot)
- [x] Empty state shown when no holdings exist
