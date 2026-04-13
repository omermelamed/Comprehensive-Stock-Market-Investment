# Phase 10 — Rebuild Deleted Frontend Pages

**Goal:** Restore the Chat, Analytics, Risk, and Options frontend pages that were removed. All backend APIs already exist — this phase is frontend-only. No backend changes required.

**Prerequisite:** Phases 7, 8, 9 complete (backends are live).

**Status:** ⬜ Not started

---

## Context

These files were deleted and need to be rebuilt connecting to existing backend endpoints:

| Feature | Deleted files | Backend endpoint |
|---------|--------------|-----------------|
| Chat | `ChatPanel.tsx`, `useChatPanel.ts`, `api/chat.ts` | `POST /api/chat` |
| Analytics | `AnalyticsPage.tsx`, `api/analytics.ts` | `GET /api/analytics` |
| Risk | `RiskPage.tsx`, `api/risk.ts` | `GET /api/risk` |
| Options | `OptionsPage.tsx`, `OptionsTransactionFormPage.tsx`, `OptionsPositionsTable.tsx`, `OptionsStrategyPanel.tsx`, `OptionsTransactionForm.tsx`, `useOptions.ts`, `api/options.ts` | `GET/POST /api/options` |

---

## Frontend Tasks

### Chat Panel
- [ ] `api/chat.ts` — `POST /api/chat` with `{ message, conversationHistory }`
- [ ] `useChatPanel.ts` — message list state, send action, loading state, clear conversation
- [ ] `ChatPanel.tsx` — slide-in panel (floating, does not navigate away):
  - message thread with markdown rendering
  - user input + send button
  - action confirmation cards styled differently from regular messages
  - "Clear conversation" button
  - purple accent for AI messages (design system: `accent-purple`)

### Analytics Page
- [ ] `api/analytics.ts` — `GET /api/analytics?range=1M|3M|6M|1Y|ALL`
- [ ] `AnalyticsPage.tsx` — layout with:
  - time range selector (1M / 3M / 6M / 1Y / ALL)
  - total return, annualized return, volatility, max drawdown, Sharpe ratio cards
  - P&L by position (bar chart via Recharts)
  - monthly returns breakdown
  - SPY benchmark comparison chart
  - realized vs unrealized P&L split

### Risk Page
- [ ] `api/risk.ts` — `GET /api/risk`
- [ ] `RiskPage.tsx` — layout with:
  - concentration risk (% in single position)
  - allocation drift (current vs target per position)
  - sector exposure breakdown
  - geographic exposure breakdown
  - volatility score (weighted avg beta)
  - configurable warning thresholds (call settings endpoint)
  - ⚠️ warning cards for threshold breaches

### Options Page
- [ ] `api/options.ts` — CRUD + strategy endpoints
- [ ] `useOptions.ts` — fetch positions, add/update/delete, strategy request
- [ ] `OptionsPositionsTable.tsx` — columns: symbol, type badge, contracts, premium paid, current premium, P&L, days to expiry (red < 7), delta, status
- [ ] `OptionsStrategyPanel.tsx` — AI strategy suggestion card (strategy name, contract details, Greeks, reasoning)
- [ ] `OptionsTransactionForm.tsx` — fields: underlying symbol, type, action, strike, expiry, contracts, premium
- [ ] `OptionsTransactionFormPage.tsx` — page wrapper for the form
- [ ] `OptionsPage.tsx` — positions table + "Add Options Position" button + strategy panel

### Navigation
- [ ] Add Analytics, Risk, Options routes to router
- [ ] Add nav links (Options only visible if OPTIONS track enabled in user profile)
- [ ] Wire floating Chat button on all pages (bottom right) → opens ChatPanel

---

## Validation Checklist

- [ ] Chat panel opens from any page without navigating away
- [ ] Chat sends message and displays AI response with markdown rendered
- [ ] Analytics page loads with correct metrics for each time range
- [ ] Benchmark comparison chart renders SPY vs portfolio
- [ ] Risk page shows correct concentration and drift values
- [ ] Options page hidden if OPTIONS track is not enabled in user profile
- [ ] Options P&L positive/negative color coded correctly
- [ ] Days to expiry turns red when < 7
- [ ] All pages match dark/light mode design system
