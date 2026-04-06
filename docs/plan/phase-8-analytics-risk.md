# Phase 8 — Performance Analytics + Risk Management

**Goal:** Deep portfolio insights — all-time P&L, benchmark comparison, monthly returns breakdown, and risk metrics with configurable warning thresholds.

**Prerequisite:** Phase 7 complete. Portfolio history (snapshots) has been accumulating.

**Status:** 🟡 Partially complete

> **Implementation note:** Core analytics (performance metrics, SPY benchmark comparison, per-position P&L) are fully implemented. Risk warnings, sector/geographic exposure, monthly returns chart, and realized P&L from closed trades are deferred.

---

## Backend Tasks

### Performance Analytics
- [x] `GET /api/analytics?range=1M|3M|6M|1Y|ALL` — combined analytics endpoint returning:
  - total return (cost basis %, absolute value)
  - snapshot-period return %
  - annualized return % (compound)
  - volatility (annualized std dev of daily returns)
  - max drawdown (peak-to-trough)
  - Sharpe ratio (vs 4.5% risk-free rate)
  - per-position P&L (unrealized, from open holdings vs cost basis)
  - SPY benchmark comparison (indexed)
- [x] `PerformanceCalculator` — pure object: snapshots + totalCostBasis → PerformanceMetrics
  - volatility: std dev of daily returns × √252 × 100
  - max drawdown: peak-to-trough, null if < 2 snapshots
  - Sharpe: (annualizedReturn − 0.045) / vol, null if vol unavailable
  - annualized return: compound formula `(1+r)^(365/days)−1`, null if < 2 days
- [ ] `RealizedPnlCalculator` — not implemented (closed position matching deferred)
- [ ] `UnrealizedPnlCalculator` as separate class — logic embedded in `AnalyticsService`

### Benchmark Comparison
- [x] `BenchmarkService` — fetches historical SPY prices via YahooFinanceAdapter, normalizes to 100 at period start
- [x] Historical price fetching via `YahooFinanceAdapter.fetchHistoricalPrices(symbol, fromDate, toDate)`
  - uses Yahoo Finance chart API with period1/period2 range params
  - parses adjclose (preferred) falling back to quote.close
  - converts Unix timestamps using America/New_York timezone
- [x] Benchmark data included in `AnalyticsResponse` (null when unavailable — degrades gracefully)
- [ ] `GET /api/analytics/benchmark?symbol=SPY&range=1Y` as separate endpoint — merged into main `/api/analytics`

### Monthly Returns
- [ ] `GET /api/analytics/monthly-returns` — not implemented
- [ ] Monthly P&L bar chart data — deferred

### Risk Metrics
- [ ] `GET /api/risk/metrics` — not implemented
- [ ] `RiskCalculator` — not implemented
- [ ] `BetaService` — not implemented
- [ ] Sector exposure — not implemented
- [ ] Geographic exposure — not implemented

### Risk Warnings
- [ ] `GET /api/risk/warnings` — not implemented
- [ ] `RiskWarningService` — not implemented
- [ ] `PUT /api/risk/thresholds` — not implemented

---

## Frontend Tasks

### Analytics Page
- [x] `AnalyticsPage` — single unified page (not tabbed)
- [x] `getAnalytics` API function — fetches all analytics data

### Performance Chart
- [x] `PerformanceChart` — lightweight-charts with two series:
  - Portfolio (indigo, solid line) — indexed to 100 at period start
  - SPY benchmark (amber, dashed line) — indexed to 100 at period start
- [x] Range selector buttons: 1M / 3M / 6M / 1Y / ALL
- [x] Legend with color coding below chart
- [x] Empty/no-snapshot message when snapshotCount = 0

### Return Metrics
- [x] `MetricCard` component — label, mono value, subLabel, optional color coding
- [x] Returns section (4 cards): total return (cost basis), portfolio period return, SPY period return, annualized return

### Risk Metrics
- [x] Risk section (3 cards): volatility (annualized), max drawdown, Sharpe ratio
- [x] Sharpe ratio color-coded (green ≥ 0, red < 0)
- [x] Graceful N/A display when insufficient snapshot history

### Position Breakdown
- [x] `PositionsTable` — symbol, label, current value, cost basis, P&L (absolute + %), portfolio weight %

### Missing tabs / sections
- [ ] Overview Tab with allocation accuracy chart — not implemented
- [ ] Benchmark Tab with benchmark selector — benchmark embedded in main page
- [ ] Monthly Returns Tab with bar chart — not implemented
- [ ] Positions P&L Tab with horizontal bar chart — P&L in table only, no separate chart tab

### Risk Management Page
- [ ] `RiskPage` — not implemented
- [ ] `ConcentrationChart` — not implemented
- [ ] `AllocationDriftTable` — not implemented
- [ ] `SectorExposureChart` — not implemented
- [ ] `GeographicExposureChart` — not implemented
- [ ] `RiskWarningsList` — not implemented
- [ ] `RiskThresholdsSettings` — not implemented

### API Client
- [x] `api/analytics.ts` — analytics endpoint with full type definitions
- [ ] `api/risk.ts` — not implemented

---

## Validation Checklist

- [x] Total return matches manual calculation from transaction history
- [ ] Realized P&L correctly matches BUY cost basis to SELL proceeds — deferred
- [x] Benchmark comparison normalized correctly (both start at same index value of 100)
- [x] Performance metrics derived from snapshot history (not re-fetched from market API)
- [ ] Concentration warning fires at user's configured threshold — not implemented
- [ ] Drift warning fires at user's configured threshold — not implemented
- [ ] Rebalancing reminder uses date of most recent confirmed monthly flow session — not implemented
- [x] Charts render empty states when data is insufficient (snapshotCount = 0 message)
