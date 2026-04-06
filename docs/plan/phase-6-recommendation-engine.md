# Phase 6 — AI Recommendation Engine

**Goal:** Proactive AI recommendations based on the user's portfolio gaps and enabled tracks. Orchestrator coordinates sub-agents and returns a ranked recommendation list.

**Prerequisite:** Phase 5 complete. Anthropic client, shared context builder, and market data adapters all exist.

**Status:** ✅ Complete

> **Implementation note:** The system uses dedicated sub-agent classes per track (`LongEquityAgentService`, `ShortAgentService`, etc.) behind an `OrchestratorAgentService` that combines active agent prompt sections into a single Claude call. This achieves the multi-agent architecture with minimal API overhead.

---

## Backend Tasks

### Orchestrator Agent
- [x] `OrchestratorAgentService` as a separate class — collects active sub-agents, combines prompt sections, delegates to `RecommendationService` for the Claude call
- [x] Track-aware user message sections injected into the Claude prompt for SHORT, CRYPTO, OPTIONS tracks
- [x] Input: full user context (holdings, gaps, risk profile, enabled tracks) sent to Claude

### Sub-Agents
- [x] `LongEquityAgentService` — always active, builds base context (portfolio, gaps, watchlist)
- [x] `ShortAgentService` — active when SHORT track enabled
- [x] `CryptoAgentService` — active when CRYPTO track enabled
- [x] `OptionsAgentService` — active when OPTIONS track enabled
- [x] `ReitAgentService` — active when REIT track enabled
- [x] `BondAgentService` — active when BOND track enabled

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
- [x] `ConfidenceBar` — visual bar indicator (HIGH=85%, MEDIUM=55%, LOW=25%) with colored fill (green/yellow/muted)
- [x] Target price + expected return % — `targetPrice` from Claude, `expectedReturnPercent` computed deterministically; rendered next to current price

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
- [x] Confidence scores sorted highest first — recommendations sorted by confidence (HIGH→MEDIUM→LOW) then by original rank, re-ranked sequentially
