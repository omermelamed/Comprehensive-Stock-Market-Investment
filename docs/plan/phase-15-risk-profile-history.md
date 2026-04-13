# Phase 15 — Risk Profile History & AI Refinement

**Goal:** Extend the risk profile beyond a single stored value. Show the history of score changes over time, display AI reasoning for each update, and auto-trigger a re-evaluation after N new transactions.

**Prerequisite:** Phase 2 complete (user profile exists). Phases 7–8 complete (AI + analytics available).

**Status:** ⬜ Not started

---

## Backend Tasks

### Database Schema
- [ ] Migration: `risk_score_history` table
  - `id`, `risk_level` (ENUM), `ai_inferred_score` (DECIMAL 0.0–1.0), `reasoning` (TEXT), `trigger` (ENUM: MANUAL/AUTO/ONBOARDING), `transaction_count_at_update` (INTEGER), `created_at`
- [ ] Backfill: insert one history row from current `user_profile` values on migration

### API
- [ ] `GET /api/profile/risk-history` — list of past score entries (newest first)
- [ ] `POST /api/profile/risk/evaluate` — trigger a manual re-evaluation; calls `RiskProfileEvaluator`; saves result to history + updates `user_profile`

### Domain
- [ ] `RiskProfileEvaluator` — calls Claude with:
  - onboarding questionnaire answers (`questionnaire_answers` from `user_profile`)
  - transaction behavior (frequency, avg hold duration, % sells vs buys, typical position sizes)
  - current risk level
  - returns: new `risk_level`, new `ai_inferred_score` (0.0–1.0), `reasoning` text
- [ ] Auto-trigger rule: after every 10th new transaction (`TransactionService` increments counter; when `count % 10 == 0`, calls evaluator async)

---

## Frontend Tasks

### Profile / Settings Page — Risk Section
- [ ] `api/riskProfile.ts` — history + evaluate endpoints
- [ ] `useRiskProfile.ts` — fetch history, trigger evaluation, loading state
- [ ] `RiskProfileCard.tsx` — current risk level badge + `ai_inferred_score` bar (0–1 scale) + "Re-evaluate" button
- [ ] `RiskReasoningPanel.tsx` — shows AI reasoning text for the most recent update
- [ ] `RiskScoreHistory.tsx` — timeline list: date, level badge, score, trigger badge (Manual / Auto / Onboarding), expandable reasoning

---

## Validation Checklist

- [ ] History table is append-only (no updates, only inserts)
- [ ] Manual re-evaluation saves a new history row and updates `user_profile`
- [ ] Auto-trigger fires after every 10 new transactions (not more, not less)
- [ ] Reasoning text is always populated (never null) after evaluation
- [ ] `ai_inferred_score` stays within 0.0–1.0
- [ ] Onboarding creates the first history row with `trigger = ONBOARDING`
- [ ] Re-evaluate button shows loading state while Claude call is in progress
