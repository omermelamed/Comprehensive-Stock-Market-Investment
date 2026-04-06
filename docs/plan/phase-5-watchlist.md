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
- [ ] `GET /api/watchlist/{id}/metrics` — dedicated metrics endpoint not implemented; metrics fetched inline during analysis
- [ ] Detailed valuation/cash flow/health/growth/momentum/sentiment metrics via separate adapters — not a separate endpoint; analysis uses ClaudeClient with available market context

### Watchlist Analysis Agent
- [x] `POST /api/watchlist/{id}/analyze` — trigger AI analysis for one symbol
- [x] `WatchlistAnalysisAgentService` — calls Claude with the `watchlist-analysis` agent prompt
  - input: symbol + user context (risk profile, holdings, allocation gaps)
  - output: `{ signal, summary, sections: { valuation, momentum, financialHealth, growth, sentiment } }`
- [x] Persist result to `watchlist.full_analysis` (JSONB) and `watchlist.signal`, `watchlist.signal_summary`
- [x] Cache result persisted to DB — user must manually re-trigger to refresh

### Watchlist → Portfolio Action
- [ ] `POST /api/watchlist/{id}/add-to-portfolio` — not implemented; user manually navigates to transactions

---

## Frontend Tasks

### Watchlist Page
- [x] `WatchlistPage` — full watchlist table
- [x] `useWatchlist` hook — fetch list, trigger analysis, add/remove

### Watchlist Table
- [x] `WatchlistTable` — columns: symbol, company name, signal, summary, last analyzed, actions
- [x] `SignalBadge` — GOOD_BUY_NOW / NOT_YET / WAIT_FOR_DIP / PENDING
- [ ] `WatchlistMetricCell` — not implemented (metrics columns not included)
- [x] `WatchlistActions` — Analyze / Remove

### Add Symbol
- [x] `AddToWatchlistInput` — symbol search input + add button
- [ ] Validates symbol exists against market API — not separately validated on add; validation happens implicitly

### Analysis Flow
- [x] `AnalyzeButton` — triggers analysis, shows loading state
- [x] `WatchlistAnalysisPanel` — expanded collapsible view of full analysis result
  - section-by-section analysis (valuation, momentum, financial health, growth, sentiment)
  - signal summary
- [ ] `OverweightWarning` — not implemented
- [ ] Confidence score — not in current output shape
- [ ] Supporting sources (clickable links) — not implemented

### Watchlist → Actions
- [ ] "Add to Portfolio" → navigates to `/transactions/new?symbol=XXX` — not implemented
- [ ] "Ask AI" → opens chatbot panel with symbol pre-loaded — not implemented
- [ ] "Set Alert" → not implemented

### API Client
- [x] `api/watchlist.ts` — CRUD + analyze endpoints

---

## Validation Checklist

- [x] Signal is one of exactly three values: GOOD_BUY_NOW, NOT_YET, WAIT_FOR_DIP (plus PENDING before analysis)
- [x] Signal justified by specific analysis sections
- [ ] Overweight warning shown when user already holds symbol above target — not implemented
- [x] Analysis result persisted — user does not lose it on page refresh
- [x] Re-analyzing overwrites the previous result
- [ ] "Add to Portfolio" pre-fills transaction form correctly — not implemented
- [x] Analysis still works if some context is unavailable (graceful degradation)
