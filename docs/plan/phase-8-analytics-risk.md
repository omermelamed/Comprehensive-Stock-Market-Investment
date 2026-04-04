# Phase 8 — Performance Analytics + Risk Management

**Goal:** Deep portfolio insights — all-time P&L, benchmark comparison, monthly returns breakdown, and risk metrics with configurable warning thresholds.

**Prerequisite:** Phase 7 complete. Portfolio history (snapshots) has been accumulating.

**Status:** ⬜ Not started

---

## Backend Tasks

### Performance Analytics
- [ ] `GET /api/analytics/performance` — return:
  - total return (absolute + %)
  - realized P&L (from closed positions)
  - unrealized P&L (from open positions)
  - ROI % (return on total invested capital)
  - allocation accuracy score over time
  - best performer (symbol + % gain)
  - worst performer (symbol + % loss)
  - win rate (% of closed trades that were profitable)
  - avg hold duration (average days positions held before closing)
- [ ] `PerformanceCalculator` — pure function: transactions + prices + snapshots → performance metrics
- [ ] `RealizedPnlCalculator` — match SELL/COVER transactions to their corresponding BUY/SHORT
- [ ] `UnrealizedPnlCalculator` — open positions × current price vs cost basis

### Benchmark Comparison
- [ ] `GET /api/analytics/benchmark?symbol=SPY&range=1Y` — return portfolio vs benchmark over time
  - portfolio values from `portfolio_snapshots`
  - benchmark prices from market API (historical)
  - normalized to 100 at start of range for fair comparison
- [ ] `BenchmarkService` — fetch and normalize comparison data

### Monthly Returns
- [ ] `GET /api/analytics/monthly-returns` — return monthly P&L by month for chart
- [ ] Derived from `portfolio_snapshots` — end of month value vs start of month

### Risk Metrics
- [ ] `GET /api/risk/metrics` — return:
  - concentration risk (% per position)
  - allocation drift (current % vs target % per position)
  - sector exposure (% per sector — sectors tagged from market API)
  - geographic exposure (US / International / Israel / Global — from symbol metadata)
  - volatility score (weighted average beta of holdings)
- [ ] `RiskCalculator` — pure function: holdings + prices + targets → risk metrics
- [ ] `BetaService` — fetch beta per symbol from market API

### Risk Warnings
- [ ] `GET /api/risk/warnings` — return active warnings based on user's configured thresholds:
  - concentration warning if any position > user's limit (default 20%, configurable)
  - drift warning if any position > user's drift limit from target (default 10%)
  - rebalancing reminder if not rebalanced in > user's configured period (default 6 months)
- [ ] `RiskWarningService` — evaluate thresholds against current state
- [ ] `PUT /api/risk/thresholds` — update user's warning thresholds

---

## Frontend Tasks

### Analytics Page
- [ ] `AnalyticsPage` — tabs: Overview | Benchmark | Monthly Returns | Positions
- [ ] `useAnalytics` hook — fetch all analytics data

### Overview Tab
- [ ] `PerformanceSummaryGrid` — total return, realized P&L, unrealized P&L, ROI, win rate, avg hold duration
- [ ] `BestWorstPerformers` — two cards side by side
- [ ] `AllocationAccuracyChart` — area chart: actual vs target allocation over time (Recharts)

### Benchmark Tab
- [ ] `BenchmarkComparisonChart` — line chart: portfolio vs SPY (and any user-added benchmark)
- [ ] `BenchmarkSelector` — input to add any symbol as benchmark
- [ ] `TimeframeSelector` — 1M / 3M / 6M / 1Y / All

### Monthly Returns Tab
- [ ] `MonthlyReturnsChart` — bar chart: green/red per month (Recharts)
- [ ] `MonthlyReturnsSummary` — best month, worst month, average monthly return

### Positions P&L Tab
- [ ] `PositionPnlChart` — horizontal bar chart sorted by P&L% (Recharts)

### Risk Management Page
- [ ] `RiskPage` — risk metrics + warnings
- [ ] `ConcentrationChart` — pie or treemap showing % per position
- [ ] `AllocationDriftTable` — current % vs target % vs drift per position
- [ ] `SectorExposureChart` — pie chart by sector
- [ ] `GeographicExposureChart` — pie chart by region
- [ ] `RiskWarningsList` — active warnings with ⚠️ icons
- [ ] `RiskThresholdsSettings` — editable concentration, drift, rebalancing thresholds

### API Client
- [ ] `api/analytics.ts` — performance, benchmark, monthly returns
- [ ] `api/risk.ts` — metrics, warnings, thresholds

---

## Validation Checklist

- [ ] Total return matches manual calculation from transaction history
- [ ] Realized P&L correctly matches BUY cost basis to SELL proceeds
- [ ] Benchmark comparison normalized correctly (starts at same index value)
- [ ] Monthly returns derived from snapshot history (not re-fetched from market API)
- [ ] Concentration warning fires at user's configured threshold, not hardcoded 20%
- [ ] Drift warning fires at user's configured threshold, not hardcoded 10%
- [ ] Rebalancing reminder uses date of most recent confirmed monthly flow session
- [ ] All charts render empty states when data is insufficient
