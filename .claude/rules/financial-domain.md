# Financial domain rules

## Hard invariants

- transactions are the source of truth
- holdings are derived, not stored as mutable authoritative state
- monthly allocation suggestions are based on target allocation gap math
- overweight positions get a suggested allocation of zero
- the system does not suggest selling as part of the monthly contribution flow
- AI advice must never override deterministic validation or persisted facts

## Implementation priorities

- keep formulas centralized in pure calculators
- test money and quantity edge cases directly
- make rounding decisions explicit near calculations
- do not duplicate business rules across frontend, backend, and SQL

## Examples

Good:
- frontend shows a live remaining budget for responsiveness
- backend revalidates the budget and generated buy transactions before persisting

Bad:
- frontend invents its own allocation formula that can drift from backend logic
- AI text decides whether a sell should be blocked
