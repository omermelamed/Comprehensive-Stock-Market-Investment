---
name: portfolio-domain-logic
description: Encodes the core portfolio rules for this investment platform. Use when working on transaction entry, holdings derivation, target allocations, snapshots, risk profile logic, alerts, or any calculation that depends on current holdings, allocation gaps, or portfolio history.
---

# Portfolio Domain Logic

Use this skill whenever code changes touch the meaning of portfolio data.

## Core invariants

- `transactions` is the source of truth
- holdings are derived, never authoritative persisted state
- monthly allocation suggestions only consider positive gaps
- overweight positions get a suggested amount of `0`
- confirmation of the monthly flow creates BUY transactions
- snapshots are daily and gap-free after catch-up runs

## Workflow

1. identify the authoritative inputs and derived outputs
2. keep the calculation in a pure domain function or clearly testable service
3. preserve transaction-ledger integrity before optimizing any UI behavior
4. update API and UI layers only after the domain rule is stable
5. add tests that cover normal cases and edge cases

## Guardrails

- never make AI responsible for exact numbers
- never move core allocation math into the frontend only
- never introduce a mutable holdings table as the source of truth

## Example

If the user records buys and sells across several months, holdings should always be recomputed from the ledger rather than incrementally trusted from a mutable balance table.

## References

- entity meanings: [references/entities.md](references/entities.md)
- calculation rules: [references/calculations.md](references/calculations.md)
