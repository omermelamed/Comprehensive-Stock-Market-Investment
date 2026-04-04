# Phase 6 — AI Recommendation Engine

**Goal:** Proactive AI recommendations based on the user's portfolio gaps and enabled tracks. Orchestrator coordinates sub-agents and returns a ranked recommendation list.

**Prerequisite:** Phase 5 complete. Anthropic client, shared context builder, and market data adapters all exist.

**Status:** ⬜ Not started

---

## Backend Tasks

### Orchestrator Agent
- [ ] `OrchestratorAgentService` — calls Claude with `orchestrator` agent prompt
  - input: full user context (holdings, gaps, risk profile, enabled tracks)
  - output: `{ priority_gaps, agents_to_invoke, orchestrator_note }`
  - only invokes sub-agents matching user's enabled tracks

### Sub-Agents
- [ ] `LongEquityAgentService` — calls Claude with `long-equity` agent prompt
  - fetches market data for the symbol first, then calls Claude
  - output: full recommendation JSON per PRD §5.5 card spec
- [ ] `ShortAgentService` — only invoked if SHORT track enabled in user profile
- [ ] `CryptoAgentService` — only invoked if CRYPTO track enabled
- [ ] `OptionsAgentService` — only invoked if OPTIONS track enabled
- [ ] `ReitAgentService` — invoked if REIT positions exist in target allocations
- [ ] `BondAgentService` — invoked if BOND positions exist in target allocations

### Recommendation Engine Coordinator
- [ ] `RecommendationEngineService`:
  1. Build shared context
  2. Call orchestrator → get list of agents to invoke + symbols
  3. Call each sub-agent in parallel
  4. Merge results, sort by `confidenceScore` descending
  5. Cache result (in-memory, 15 minutes)
  6. Return unified recommendation list

### Recommendation Cache
- [ ] `RecommendationCacheService` — stores result in `ai_recommendation_cache` table
- [ ] Auto-invalidates after 15 minutes (`expires_at` column)
- [ ] `GET /api/recommendations` — returns cached result if valid, regenerates if expired
- [ ] `POST /api/recommendations/refresh` — force regenerate

### Recommendation Endpoints
- [ ] `GET /api/recommendations` — return current recommendations (from cache or regenerate)
- [ ] `POST /api/recommendations/refresh` — invalidate cache and regenerate

---

## Frontend Tasks

### Recommendations Page
- [ ] `RecommendationsPage` — full recommendations list
- [ ] `useRecommendations` hook — fetch on page load, handle loading + empty states
- [ ] `RefreshButton` — triggers manual refresh with loading state

### Recommendation Card
- [ ] `RecommendationCard` — displays all fields from PRD §5.5:
  - symbol + name + agent source badge
  - recommendation badge (BUY / HOLD / WAIT)
  - current price + target price + expected return %
  - time horizon
  - P/E, PEG, D/E, FCF with signal colors
  - AI reasoning text (3–5 sentences)
  - risk level + confidence score
  - portfolio fit note
  - supporting sources (clickable links)
- [ ] `AgentSourceBadge` — LONG_EQUITY / SHORT / CRYPTO / OPTIONS / REIT / BOND
- [ ] `RecommendationBadge` — BUY (green) / HOLD (yellow) / WAIT (gray)
- [ ] `ConfidenceBar` — visual 0–100% indicator

### Loading + Empty States
- [ ] Skeleton cards while loading
- [ ] Empty state if no tracks enabled or no recommendations generated
- [ ] Error state with retry button

### API Client
- [ ] `api/recommendations.ts` — fetch and refresh endpoints

---

## Validation Checklist

- [ ] Only sub-agents matching user's enabled tracks are invoked
- [ ] Overweight positions are never recommended as BUY
- [ ] Results cached for 15 minutes — no duplicate API calls on page revisit
- [ ] Manual refresh works and returns fresh results
- [ ] Sub-agent failure does not crash the whole response (partial results shown)
- [ ] Confidence scores visible and correctly sorted (highest first)
- [ ] Portfolio fit note references the user's actual allocation gap
