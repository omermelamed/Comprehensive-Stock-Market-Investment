# Phase 4 — Monthly Flow + AI Summaries

**Goal:** Add a one-line AI summary per position card in the Monthly Investment Flow.
The deterministic math from Phase 3 must remain unchanged — AI is an additive layer only.

**Prerequisite:** Phase 3 complete and validated. Monthly flow works correctly without AI.

**Status:** ⬜ Not started

---

## What Changes from Phase 3

Phase 3 preview response already has `aiSummary: null` per position card.
This phase fills it in using the `monthly-flow` agent.

---

## Backend Tasks

### Anthropic Client
- [ ] `AnthropicClient` — HTTP client for Claude API (`POST /v1/messages`)
- [ ] `AnthropicConfig` — reads `ANTHROPIC_API_KEY` from env, configures model (`claude-sonnet-4-6`)
- [ ] `AgentRequest` / `AgentResponse` — shared DTOs for all Claude API calls
- [ ] JSON parse helper — strip markdown fences, parse to typed response

### Shared Context Builder
- [ ] `SharedContextBuilder` — reads `user_profile`, derived holdings, and `target_allocations` from DB
- [ ] `UserContext` — structured context object injected into every agent call
- [ ] `formatSharedContext(UserContext): String` — formats as the prompt string defined in `AGENTS.md §2`

### Monthly Flow Agent
- [ ] `MonthlyFlowAgentService` — calls Claude API with the `monthly-flow` agent prompt
  - input per position: symbol, label, target %, current %, gap, metrics, user context
  - output: `{ symbol, summary: String, sentiment: POSITIVE | NEUTRAL | CAUTIOUS }`
- [ ] Run all position calls in parallel (`async` / coroutines)
- [ ] Cache responses for 15 minutes (in-memory, keyed by symbol + gap + metrics hash)
- [ ] On agent failure: return `aiSummary: null` gracefully — do not fail the whole preview

### Preview Endpoint Update
- [ ] Update `MonthlyFlowPreviewService` to call `MonthlyFlowAgentService` after computing position cards
- [ ] AI summaries are appended to position cards before returning response
- [ ] If AI is unavailable (no API key, timeout, error): return cards without summaries

---

## Frontend Tasks

### Position Card Update
- [ ] `UnderweightPositionCard` — render `aiSummary` when present
- [ ] `AiSummarySection` — styled AI text block with 💬 icon and purple accent
- [ ] Skeleton loader for AI summary while loading (shimmer, not spinner)
- [ ] If `aiSummary` is null: hide the section entirely (no placeholder text)
- [ ] AI text is visually secondary to the deterministic metrics

### Loading State
- [ ] Position cards render immediately with metrics
- [ ] AI summaries can stream in separately if needed (or load with the full response)

---

## Validation Checklist

- [ ] Monthly flow still works correctly if `ANTHROPIC_API_KEY` is not set (graceful degradation)
- [ ] AI summary references the user's actual gap (e.g. "You're underweight by X%")
- [ ] AI summary references at least one specific metric
- [ ] Deterministic suggested amounts are unchanged — AI does not affect them
- [ ] Cache prevents duplicate API calls within 15 minutes for the same position state
- [ ] Agent failure does not crash the preview endpoint
- [ ] Sentiment field correctly reflects positive / neutral / cautious tone
