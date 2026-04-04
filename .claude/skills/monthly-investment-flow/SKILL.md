---
name: monthly-investment-flow
description: Guides implementation of the core monthly investment flow in this monorepo. Use when Claude works on budget entry, current-vs-target allocation gap calculation, suggested allocations, running totals, confirmation flows, automatic buy transaction logging, or AI summaries layered on top of deterministic monthly investment math.
---

# Monthly investment flow

This is the most important product workflow. Treat it as finance-critical.

## Workflow

1. load current holdings, target allocations, and prices
2. compute current values and target gaps deterministically
3. set overweight positions to zero suggestion
4. distribute monthly budget proportionally across positive gaps
5. let the user override suggestions while keeping totals visible
6. revalidate on confirmation before logging buy transactions
7. render AI summaries as supporting commentary only

## Hard rules

- overweight positions never receive a positive suggested buy amount
- the flow never suggests selling
- deterministic numbers must appear before AI commentary
- frontend can mirror math for responsiveness, but backend owns final validation
- confirmed allocations become BUY transactions in the ledger

## Example formula ownership

- calculator: gap and suggested percentage math
- service: orchestration and final validation
- frontend: local editing state and running totals
- AI layer: one-line explanatory summaries using already-computed facts

## Anti-patterns

Avoid:
- AI deciding allocations instead of deterministic math
- rounding money differently in frontend and backend without an explicit shared rule
- skipping final backend validation because the UI already looked correct

## References

- domain invariants: [../../context/domain-invariants.md](../../context/domain-invariants.md)
- financial phasing: [../../context/phasing-and-ai.md](../../context/phasing-and-ai.md)
- workflow: [references/workflow.md](references/workflow.md)
- formulas: [references/formulas.md](references/formulas.md)
