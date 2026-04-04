---
name: dashboard-metrics
description: Guides implementation of portfolio dashboard metrics in this monorepo. Use when adding portfolio totals, pnl, allocation health, historical chart data, holdings table metrics, or benchmark views so that displayed numbers remain consistent with the ledger, prices, and snapshot history.
---

# Dashboard metrics

Use this skill for read models and UI-facing financial summaries.

## Workflow

1. identify the source of truth for the metric
2. separate deterministic calculation from presentation formatting
3. expose stable backend fields for the frontend
4. keep chart and table numbers consistent for the same time window

## Rules

- avoid duplicate metric formulas in multiple frontend components
- make time-window assumptions explicit
- format numbers consistently but do not bury rounding rules in the UI
- prefer backend-shaped DTOs for dashboard summaries

## References

- checklist: [references/checklist.md](references/checklist.md)
- domain invariants: [../../context/domain-invariants.md](../../context/domain-invariants.md)
