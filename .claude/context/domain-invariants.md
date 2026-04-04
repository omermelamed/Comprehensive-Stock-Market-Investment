# Domain invariants

These rules protect correctness. If a requested change conflicts with them, call that out explicitly.

## Ledger and holdings

- `transactions` is the source of truth for holdings.
- Holdings are derived, never manually edited as durable state.
- A mutable holdings table may exist only as a cache or projection, never as the authority.

## Transaction semantics

- `BUY` increases long exposure.
- `SELL` reduces long exposure and must not exceed available long quantity.
- `SHORT` increases short exposure.
- `COVER` reduces short exposure and must not exceed open short quantity.
- Transaction history should remain auditable.

## Target allocations and monthly flow

- Target allocations drive the monthly investment flow.
- Positive gap means underweight and eligible for suggested investment.
- Zero or negative gap means overweight or on-target and suggested amount must be `0`.
- Suggested allocation is proportional to positive gaps only.
- User overrides are allowed, but the running total must never silently exceed budget.
- Confirmed monthly allocations create `BUY` transactions.
- The monthly flow never suggests selling.

## Snapshots

- Snapshot history is append-only by day.
- There should be at most one logical snapshot per date.
- Catch-up snapshots use historical pricing and `snapshot_source = CATCHUP`.
- Scheduled snapshots use current pricing and `snapshot_source = SCHEDULED`.

## AI boundary

- AI outputs must reference portfolio context but must never replace calculations.
- AI can explain, rank, summarize, and caution.
- AI must not be the source of exact numbers, validation decisions, or durable state transitions.

## Example interpretation

If the user is overweight in VXUS and underweight in VOO, the system may explain why VXUS looks attractive in isolation, but the monthly flow still suggests `0` for VXUS because portfolio fit outranks isolated opinion.
