# Investment Platform — Build Plan

Based on PRD v1.3. Each phase builds on the previous. Do not start a phase until the prior one is working and validated.

## Phases

| Phase | File | Feature | Status |
|-------|------|---------|--------|
| 1 | [phase-1-onboarding.md](phase-1-onboarding.md) | Onboarding Flow + Transaction Entry | ⬜ Not started |
| 2 | [phase-2-dashboard.md](phase-2-dashboard.md) | Dashboard | ⬜ Not started |
| 3 | [phase-3-monthly-flow.md](phase-3-monthly-flow.md) | Monthly Investment Flow (math only) | ⬜ Not started |
| 4 | [phase-4-monthly-flow-ai.md](phase-4-monthly-flow-ai.md) | Monthly Flow + AI Summaries | ⬜ Not started |
| 5 | [phase-5-watchlist.md](phase-5-watchlist.md) | Watchlist + AI Analysis | ⬜ Not started |
| 6 | [phase-6-recommendation-engine.md](phase-6-recommendation-engine.md) | AI Recommendation Engine | ⬜ Not started |
| 7 | [phase-7-chatbot.md](phase-7-chatbot.md) | Portfolio Chatbot | ⬜ Not started |
| 8 | [phase-8-analytics-risk.md](phase-8-analytics-risk.md) | Performance Analytics + Risk Management | ⬜ Not started |
| 9 | [phase-9-options.md](phase-9-options.md) | Options Trading | ⬜ Not started |

## Key Rules (from PRD)

- Zero hardcoded user data — everything comes from `user_profile` and `target_allocations`
- `transactions` is the source of truth — holdings are always derived, never stored
- AI is advisory only — it never owns formulas, validation, or persistence
- Build phases 1–3 before adding any AI features
- Each phase must pass validation before starting the next

## Reference

- [PRD v1.3](../PRD_Investment_Platform_v1.3.md)
- [Domain invariants](../../.claude/context/domain-invariants.md)
- [Architecture](../../.claude/context/architecture-and-structure.md)
