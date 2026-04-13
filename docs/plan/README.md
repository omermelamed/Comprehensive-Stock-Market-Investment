# Investment Platform — Build Plan

Based on PRD v1.4. Each phase builds on the previous. Do not start a phase until the prior one is working and validated.

## Phases

| Phase | File | Feature | Status |
|-------|------|---------|--------|
| 1 | [phase-1-onboarding.md](phase-1-onboarding.md) | Onboarding Flow + Transaction Entry | ✅ Complete |
| 2 | [phase-2-dashboard.md](phase-2-dashboard.md) | Dashboard | ✅ Complete |
| 3 | [phase-3-monthly-flow.md](phase-3-monthly-flow.md) | Monthly Investment Flow (math only) | ✅ Complete |
| 4 | [phase-4-monthly-flow-ai.md](phase-4-monthly-flow-ai.md) | Monthly Flow + AI Summaries | ✅ Complete |
| 5 | [phase-5-watchlist.md](phase-5-watchlist.md) | Watchlist + AI Analysis | ✅ Complete |
| 6 | [phase-6-recommendation-engine.md](phase-6-recommendation-engine.md) | AI Recommendation Engine | ✅ Complete |
| 7 | [phase-7-chatbot.md](phase-7-chatbot.md) | Portfolio Chatbot | ✅ Complete |
| 8 | [phase-8-analytics-risk.md](phase-8-analytics-risk.md) | Performance Analytics + Risk Management | ✅ Complete |
| 9 | [phase-9-options.md](phase-9-options.md) | Options Trading | ✅ Complete (backend) |
| 10 | [phase-10-frontend-rebuild.md](phase-10-frontend-rebuild.md) | Rebuild Deleted Frontend Pages (Chat, Analytics, Risk, Options) | ⬜ Not started |
| 11 | [phase-11-alerts-ui.md](phase-11-alerts-ui.md) | Alerts UI | ⬜ Not started |
| 12 | [phase-12-whatsapp-bot.md](phase-12-whatsapp-bot.md) | WhatsApp Bot — Full Inbound Capability | ⬜ Not started |
| 13 | [phase-13-scheduled-whatsapp.md](phase-13-scheduled-whatsapp.md) | Scheduled WhatsApp Messages | ⬜ Not started |
| 14 | [phase-14-import-export.md](phase-14-import-export.md) | Import & Export | ⬜ Not started |
| 15 | [phase-15-risk-profile-history.md](phase-15-risk-profile-history.md) | Risk Profile History & AI Refinement | ⬜ Not started |
| 16 | [phase-16-onboarding-gaps.md](phase-16-onboarding-gaps.md) | Onboarding Gaps (WhatsApp step, timezone, tracks) | ⬜ Not started |

## Key Rules (from PRD)

- Zero hardcoded user data — everything comes from `user_profile` and `target_allocations`
- `transactions` is the source of truth — holdings are always derived, never stored
- AI is advisory only — it never owns formulas, validation, or persistence
- Build phases 1–3 before adding any AI features
- Each phase must pass validation before starting the next

## Reference

- [PRD v1.4](../PRD_Investment_Platform_v1.4.md)
- [PRD v1.3](../PRD_Investment_Platform_v1.3.md)
- [Domain invariants](../../.claude/context/domain-invariants.md)
- [Architecture](../../.claude/context/architecture-and-structure.md)
