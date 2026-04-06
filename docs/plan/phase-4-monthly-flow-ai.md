# Phase 4 — Monthly Flow + AI Summaries

**Goal:** Add a one-line AI summary per position card in the Monthly Investment Flow.
The deterministic math from Phase 3 must remain unchanged — AI is an additive layer only.

**Prerequisite:** Phase 3 complete and validated. Monthly flow works correctly without AI.

**Status:** ✅ Complete

---

## What Changes from Phase 3

Phase 3 preview response already has `aiSummary: null` per position card.
This phase fills it in using the `monthly-flow` agent.

---

## Backend Tasks

### Anthropic Client
- [x] `ClaudeClient` — HTTP client for Claude API (`POST /v1/messages`)
- [x] `ClaudeConfig` — reads `ANTHROPIC_API_KEY` from env, configures model (`claude-sonnet-4-6`)
- [x] `ClaudeMessage` / response types — shared DTOs for all Claude API calls
- [x] JSON parse helper — strip markdown fences, parse to typed response

### Shared Context Builder
- [x] Context building embedded in each service (portfolio context passed as system prompt)
- [ ] `SharedContextBuilder` as a dedicated reusable class — not extracted; context built inline per service

### Monthly Flow Agent
- [x] `MonthlyFlowAgentService` — calls Claude API with position context
  - input per position: symbol, label, target %, current %, gap, user context
  - output: `{ symbol, aiSummary, sentiment }` or null on failure
- [x] On agent failure: return `aiSummary: null` gracefully — does not fail the whole preview
- [ ] Parallel invocation via coroutines — sequential in current implementation
- [ ] 15-minute in-memory cache keyed by position state hash — not implemented; AI called fresh each preview

### Preview Endpoint Update
- [x] Update `MonthlyFlowPreviewService` to call `MonthlyFlowAgentService` after computing position cards
- [x] AI summaries appended to position cards before returning response
- [x] If AI unavailable (no API key, timeout, error): returns cards without summaries

---

## Frontend Tasks

### Position Card Update
- [x] `UnderweightPositionCard` — renders `aiSummary` when present
- [x] `AiSummarySection` — styled AI text block with purple accent
- [x] If `aiSummary` is null: section hidden entirely (no placeholder text)
- [x] AI text is visually secondary to the deterministic metrics
- [ ] Skeleton loader for AI summary while loading — not implemented (loads with full response)

### Loading State
- [x] Position cards render immediately with metrics
- [x] AI summaries load with the full response (not streamed separately)

---

## Validation Checklist

- [x] Monthly flow still works correctly if `ANTHROPIC_API_KEY` is not set (graceful degradation)
- [x] AI summary references the user's actual gap
- [x] Deterministic suggested amounts are unchanged — AI does not affect them
- [x] Agent failure does not crash the preview endpoint
- [ ] Cache prevents duplicate API calls within 15 minutes — not implemented
- [ ] Sentiment field correctly reflects positive / neutral / cautious tone — sentiment not in current response shape
