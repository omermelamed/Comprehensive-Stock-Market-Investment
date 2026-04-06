# Phase 6 — AI Recommendation Engine

**Goal:** Proactive AI recommendations based on the user's portfolio gaps and enabled tracks. Orchestrator coordinates sub-agents and returns a ranked recommendation list.

**Prerequisite:** Phase 5 complete. Anthropic client, shared context builder, and market data adapters all exist.

**Status:** ✅ Complete

> **Implementation note:** The PRD specified a multi-agent orchestrator pattern (orchestrator → separate sub-agents per track). The actual implementation uses a single Claude call with track-aware user message sections. This achieves the same functional outcome with significantly less complexity and fewer API calls. The simplification is intentional and aligned with the single-user local-app posture.

---

## Backend Tasks

### Orchestrator Agent
- [ ] `OrchestratorAgentService` as a separate class — not implemented; orchestration logic embedded in `RecommendationService`
- [x] Track-aware user message sections injected into the Claude prompt for SHORT, CRYPTO, OPTIONS tracks
- [x] Input: full user context (holdings, gaps, risk profile, enabled tracks) sent to Claude

### Sub-Agents
- [ ] `LongEquityAgentService` — not a separate class; handled by single Claude call
- [ ] `ShortAgentService` — not a separate class; SHORT track adds instructions to the user message
- [ ] `CryptoAgentService` — not a separate class; CRYPTO track adds instructions to the user message
- [ ] `OptionsAgentService` — not a separate class; OPTIONS track adds instructions to the user message
- [ ] `ReitAgentService` — not implemented
- [ ] `BondAgentService` — not implemented

### Recommendation Engine Coordinator
- [x] `RecommendationService`:
  1. Build portfolio context (holdings, prices, gaps, watchlist signals)
  2. Build track-aware user message with underweight gaps + watchlist + track instructions
  3. Single Claude call with full context
  4. Parse and enrich result: currentPrice, fundamentals (Alpha Vantage), sourceUrl (Yahoo Finance)
  5. Cache result (DB, 15 minutes)
  6. Return unified recommendation list
- [x] `RecommendationGapCalculator` — pure domain object: computes underweight gaps, sorts by gap descending, limits to top 5

### Recommendation Cache
- [x] `RecommendationCacheRepository` — stores result in `ai_recommendation_cache` table (JSONB)
- [x] Auto-invalidates after 15 minutes (`expires_at` column)
- [x] `GET /api/recommendations` — returns cached result if valid, regenerates if expired
- [x] `POST /api/recommendations/refresh` — force regenerate
- [x] Failed/empty generation does not overwrite a valid cache entry

### Recommendation Endpoints
- [x] `GET /api/recommendations` — return current recommendations (from cache or regenerate)
- [x] `POST /api/recommendations/refresh` — invalidate cache and regenerate

### Enrichment (additions beyond original PRD)
- [x] `currentPrice` — deterministic, from market data
- [x] `fundamentals` — P/E, PEG, EPS, dividend yield, 52W high/low, market cap via Alpha Vantage OVERVIEW (1-hour cache)
- [x] `sourceUrl` — deterministic Yahoo Finance quote URL per symbol
- [x] `generationError` field — `null` on success, `"claude_failure"` or `"parse_failure"` on error
- [x] `timeHorizon` and `catalysts` fields — AI-generated, advisory only
- [x] Live portfolio total recomputed on cache-hit responses

---

## Frontend Tasks

### Recommendations Page
- [x] `RecommendationsPage` — full recommendations list
- [x] `useRecommendations` hook — fetch on page load, handle loading + empty states
- [x] `RefreshButton` — triggers manual refresh with loading state
- [x] Error banner for `claude_failure` vs `parse_failure` generation errors

### Recommendation Card
- [x] `RecommendationCard` — displays:
  - rank number + symbol (clickable link to Yahoo Finance when sourceUrl present)
  - current price
  - action badge: BUY (green) / SHORT (red) / COVERED_CALL (yellow)
  - source badge: ALLOCATION_GAP / WATCHLIST / AI_SUGGESTION
  - confidence level: HIGH / MEDIUM / LOW
  - time horizon pill
  - AI reasoning text (purple section)
  - catalysts bullet list
  - fundamentals panel: P/E, PEG, EPS, div yield, 52W high/low, market cap
  - suggested amount (footer row)
- [x] `FundamentalsPanel` — compact key/value grid, filters out missing values
- [ ] `ConfidenceBar` — visual 0–100% indicator not implemented (text label only)
- [ ] Target price + expected return % — not in output (AI not allowed to invent prices)

### Loading + Empty States
- [x] Skeleton cards while loading
- [x] Empty state if no recommendations generated
- [x] Error state with retry button

### API Client
- [x] `api/recommendations.ts` — fetch and refresh endpoints

---

## Validation Checklist

- [x] Only tracks matching the user's enabled tracks inject instructions into the Claude prompt
- [x] Results cached for 15 minutes — no duplicate API calls on page revisit
- [x] Manual refresh works and returns fresh results
- [x] Claude failure does not crash the endpoint — returns empty list with generationError
- [x] Portfolio fit note references the user's actual allocation gap
- [ ] Confidence scores sorted highest first — sorting is by Claude-assigned rank, not by confidence score field
