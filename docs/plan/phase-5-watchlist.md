# Phase 5 — Watchlist + AI Analysis

**Goal:** User can maintain a watchlist of symbols and trigger on-demand deep AI analysis that returns a Good Buy Now / Not Yet / Wait for Dip signal.

**Prerequisite:** Phase 4 complete. Anthropic client and shared context builder exist.

**Status:** ⬜ Not started

---

## Backend Tasks

### Watchlist CRUD
- [ ] `GET /api/watchlist` — return all watchlist items with live prices + cached signals
- [ ] `POST /api/watchlist` — add a symbol (fetch company name from market API)
- [ ] `DELETE /api/watchlist/{id}` — remove a symbol
- [ ] `WatchlistRepository` — jOOQ queries for watchlist table
- [ ] `WatchlistService` — orchestration

### Market Data for Watchlist
- [ ] `GET /api/watchlist/{id}/metrics` — fetch full metrics for a symbol:
  - valuation: P/E, Forward P/E, P/B, P/S, EV/EBITDA, PEG
  - cash flow: FCF, FCF Yield, gross/operating/net margin, ROE, ROA
  - health: D/E, current ratio, interest coverage
  - growth: revenue YoY, EPS YoY, EPS trend (4Q)
  - momentum: relative strength vs S&P 500, 52w high/low distance, analyst consensus
  - sentiment: news sentiment, insider activity
- [ ] `WatchlistMetricsService` — fetch and assemble all metrics via market data adapters

### Watchlist Analysis Agent
- [ ] `POST /api/watchlist/{id}/analyze` — trigger AI analysis for one symbol
- [ ] `WatchlistAnalysisAgentService` — calls Claude with the `watchlist-analysis` agent prompt
  - input: full metrics + user context (risk profile, holdings, allocation gaps)
  - output: `{ signal, signalLabel, currentPrice, targetPrice, expectedReturnPercent, oneLinerSummary, fullAnalysis, keyMetrics, overweightWarning, riskLevel, confidenceScore, sources }`
- [ ] Persist result to `watchlist.full_analysis` (JSONB) and `watchlist.signal`, `watchlist.signal_summary`
- [ ] Cache result for session (user must manually re-trigger)

### Watchlist → Portfolio Action
- [ ] `POST /api/watchlist/{id}/add-to-portfolio` — returns pre-filled transaction form data for the symbol

---

## Frontend Tasks

### Watchlist Page
- [ ] `WatchlistPage` — full watchlist table
- [ ] `useWatchlist` hook — fetch list, trigger analysis, add/remove

### Watchlist Table
- [ ] `WatchlistTable` — columns: symbol, price, 24h change, P/E, PEG, D/E, FCF, signal, summary, actions
- [ ] `SignalBadge` — ✅ Good Buy Now / ⏳ Not Yet / 🕐 Wait for Dip
- [ ] `WatchlistMetricCell` — colored metric value
- [ ] `WatchlistActions` — Analyze / Add to Portfolio / Ask AI / Set Alert / Remove

### Add Symbol
- [ ] `AddToWatchlistInput` — symbol search input + add button
- [ ] Validates symbol exists (checks against market API)

### Analysis Flow
- [ ] `AnalyzeButton` — triggers analysis, shows loading spinner
- [ ] `WatchlistAnalysisPanel` — expanded view of full analysis result
  - bull case / bear case / verdict
  - all metrics with signals
  - confidence score
  - supporting sources (clickable links)
- [ ] `OverweightWarning` — shown if user already holds this symbol at/above target

### Watchlist → Actions
- [ ] "Add to Portfolio" → navigates to `/transactions/new?symbol=XXX`
- [ ] "Ask AI" → opens chatbot panel with symbol pre-loaded as context
- [ ] "Set Alert" → opens alert creation modal pre-filled with symbol

### API Client
- [ ] `api/watchlist.ts` — CRUD + analyze + metrics endpoints

---

## Validation Checklist

- [ ] Signal is one of exactly three values: GOOD_BUY_NOW, NOT_YET, WAIT_FOR_DIP
- [ ] Signal must be justified by specific metrics — generic signals should not appear
- [ ] Overweight warning shown when user already holds symbol above target
- [ ] Analysis result persisted — user does not lose it on page refresh
- [ ] Re-analyzing overwrites the previous result
- [ ] "Add to Portfolio" pre-fills transaction form correctly
- [ ] Analysis still works if some metrics are unavailable (partial data handled gracefully)
