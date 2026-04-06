# Phase 8 — Performance Analytics + Risk Management

**Goal:** Deep portfolio insights — all-time P&L, benchmark comparison, monthly returns breakdown, and risk metrics with configurable warning thresholds.

**Prerequisite:** Phase 7 complete. Portfolio history (snapshots) has been accumulating.

**Status:** ✅ Complete

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
  - realized P&L from closed trades (FIFO-matched)
- [x] `PerformanceCalculator` — pure object: snapshots + totalCostBasis → PerformanceMetrics
  - volatility: std dev of daily returns × √252 × 100
  - max drawdown: peak-to-trough, null if < 2 snapshots
  - Sharpe: (annualizedReturn − 0.045) / vol, null if vol unavailable
  - annualized return: compound formula `(1+r)^(365/days)−1`, null if < 2 days
- [x] `RealizedPnlCalculator` — pure domain object, FIFO BUY→SELL and SHORT→COVER matching
- [x] `UnrealizedPnlCalculator` — extracted as separate pure class

### Benchmark Comparison
- [x] `BenchmarkService` — fetches historical SPY prices via YahooFinanceAdapter, normalizes to 100 at period start
- [x] Historical price fetching via `YahooFinanceAdapter.fetchHistoricalPrices(symbol, fromDate, toDate)`
  - uses Yahoo Finance chart API with period1/period2 range params
  - parses adjclose (preferred) falling back to quote.close
  - converts Unix timestamps using America/New_York timezone
- [x] Benchmark data included in `AnalyticsResponse` (null when unavailable — degrades gracefully)
- [x] `GET /api/analytics/benchmark?symbol=SPY&range=1Y` — separate endpoint with configurable symbol

### Monthly Returns
- [x] `GET /api/analytics/monthly-returns?range=1Y` — monthly P&L data
- [x] Groups snapshots by YYYY-MM, computes start/end values and return %

### Risk Metrics
- [x] `GET /api/risk/metrics` — concentration, drift, sector, geographic, vol, drawdown, Sharpe
- [x] `RiskService` — computes all risk metrics from holdings, allocations, and fundamentals
- [x] Sector exposure via AlphaVantage fundamentals (sector + country fields added to FundamentalsData)
- [x] Geographic exposure via AlphaVantage fundamentals
- [x] Portfolio beta — returns null (correlation with SPY deferred to avoid complexity)

### Risk Warnings
- [x] `GET /api/risk/warnings` — generated from thresholds vs current metrics
- [x] `RiskWarningService` — concentration, sector, drawdown, drift, rebalance warnings
- [x] `GET /api/risk/thresholds` + `PUT /api/risk/thresholds` — configurable thresholds
- [x] `risk_thresholds` table via V2 Flyway migration

---

## Frontend Tasks

### Analytics Page
- [x] `AnalyticsPage` — tabbed layout with Overview, Benchmark, Monthly Returns, Positions P&L
- [x] `getAnalytics` API function — fetches all analytics data
- [x] `getMonthlyReturns` + `getAnalyticsBenchmark` API functions

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

### Tabs
- [x] Overview Tab with allocation accuracy chart (target vs current horizontal bars)
- [x] Benchmark Tab with benchmark symbol selector and comparison table
- [x] Monthly Returns Tab with bar chart (green/red bars, summary stats)
- [x] Positions P&L Tab with horizontal P&L bars and realized trades table

### Risk Management Page
- [x] `RiskPage` — full risk management dashboard
- [x] `ConcentrationChart` — horizontal bars with threshold line
- [x] `AllocationDriftTable` — symbol, target/current/drift %, colored status
- [x] `SectorExposureChart` — donut chart with threshold highlighting
- [x] `GeographicExposureChart` — horizontal bars with symbol lists
- [x] `RiskWarningsList` — severity-colored warning banners
- [x] `RiskThresholdsSettings` — expandable settings with save functionality

### API Client
- [x] `api/analytics.ts` — analytics, monthly returns, benchmark endpoints with full type definitions
- [x] `api/risk.ts` — risk metrics, warnings, thresholds endpoints

---

## Validation Checklist

- [x] Total return matches manual calculation from transaction history
- [x] Realized P&L correctly matches BUY cost basis to SELL proceeds (FIFO)
- [x] Benchmark comparison normalized correctly (both start at same index value of 100)
- [x] Performance metrics derived from snapshot history (not re-fetched from market API)
- [x] Concentration warning fires at user's configured threshold
- [x] Drift warning fires at user's configured threshold
- [x] Rebalancing reminder uses date of most recent confirmed monthly flow session
- [x] Charts render empty states when data is insufficient (snapshotCount = 0 message)
