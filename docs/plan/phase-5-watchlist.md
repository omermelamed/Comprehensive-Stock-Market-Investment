# Phase 5 — Watchlist + AI Analysis

**Goal:** User can maintain a watchlist of symbols and trigger on-demand deep AI analysis that returns a Good Buy Now / Not Yet / Wait for Dip signal.

**Prerequisite:** Phase 4 complete. Anthropic client and shared context builder exist.

**Status:** ✅ Complete

---

## Backend Tasks

### Watchlist CRUD
- [x] `GET /api/watchlist` — return all watchlist items with live prices + cached signals
- [x] `POST /api/watchlist` — add a symbol (fetch company name from market API)
- [x] `DELETE /api/watchlist/{id}` — remove a symbol
- [x] `WatchlistRepository` — jOOQ queries for watchlist table
- [x] `WatchlistService` — orchestration

### Market Data for Watchlist
- [x] `GET /api/watchlist/{id}/metrics` — returns current price, currency, and fundamentals (P/E, PEG, EPS, div yield, 52W range, market cap)
- [x] Metrics fetched from MarketDataService + AlphaVantageAdapter on demand

### Watchlist Analysis Agent
- [x] `POST /api/watchlist/{id}/analyze` — trigger AI analysis for one symbol
- [x] `WatchlistAnalysisAgentService` — calls Claude with the `watchlist-analysis` agent prompt
  - input: symbol + user context (risk profile, holdings, allocation gaps)
  - output: `{ signal, summary, sections: { valuation, momentum, financialHealth, growth, sentiment } }`
- [x] Persist result to `watchlist.full_analysis` (JSONB) and `watchlist.signal`, `watchlist.signal_summary`
- [x] Cache result persisted to DB — user must manually re-trigger to refresh

### Watchlist → Portfolio Action
- [x] `POST /api/watchlist/{id}/add-to-portfolio` — creates BUY transaction from watchlist item at current market price

---

## Frontend Tasks

### Watchlist Page
- [x] `WatchlistPage` — full watchlist table
- [x] `useWatchlist` hook — fetch list, trigger analysis, add/remove

### Watchlist Table
- [x] `WatchlistTable` — columns: symbol, company name, signal, summary, last analyzed, actions
- [x] `SignalBadge` — GOOD_BUY_NOW / NOT_YET / WAIT_FOR_DIP / PENDING
- [x] `WatchlistMetricCell` — lazy-loaded metric grid (price, P/E, div yield, market cap) shown when analysis is expanded
- [x] `WatchlistActions` — Analyze / Remove

### Add Symbol
- [x] `AddToWatchlistInput` — symbol search input + add button
- [x] Validates symbol exists against market API — `WatchlistService.addItem()` calls `marketDataService.getQuote()` before insert

### Analysis Flow
- [x] `AnalyzeButton` — triggers analysis, shows loading state
- [x] `WatchlistAnalysisPanel` — expanded collapsible view of full analysis result
  - section-by-section analysis (valuation, momentum, financial health, growth, sentiment)
  - signal summary
- [x] `OverweightWarning` — amber banner when symbol is already overweight in portfolio (fetches portfolio holdings)
- [x] Confidence score — `confidenceScore: 0-100` in Claude analysis output, rendered as progress bar in card header
- [x] Supporting sources (clickable links) — `sources` array in analysis JSON, rendered as clickable hostname links with ExternalLink icon

### Watchlist → Actions
- [x] "Add to Portfolio" → navigates to `/transactions/new?symbol=XXX` with pre-filled symbol
- [x] "Ask AI" → opens chatbot panel with symbol-specific question pre-loaded via `ChatContext`
- [x] "Set Alert" → inline form on watchlist page (condition ABOVE/BELOW, price, note); AlertController + AlertRepository + AlertService + AlertCheckScheduler (every 5 min)

### API Client
- [x] `api/watchlist.ts` — CRUD + analyze endpoints

---

## Validation Checklist

- [x] Signal is one of exactly three values: GOOD_BUY_NOW, NOT_YET, WAIT_FOR_DIP (plus PENDING before analysis)
- [x] Signal justified by specific analysis sections
- [x] Overweight warning shown when user already holds symbol above target — amber banner via portfolio holdings check
- [x] Analysis result persisted — user does not lose it on page refresh
- [x] Re-analyzing overwrites the previous result
- [x] "Add to Portfolio" pre-fills transaction form correctly — `TransactionFormPage` reads `?symbol=` query param
- [x] Analysis still works if some context is unavailable (graceful degradation)
