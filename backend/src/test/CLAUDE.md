# Backend test scoped context

Use this file for code under `backend/src/test/`.

## What to prioritize in tests

- domain calculators and validators
- transaction edge cases
- monthly allocation suggestion logic
- snapshot catch-up behavior
- repository behavior when schema semantics matter

## High-value edge cases

- selling more than held
- covering more than the open short exposure
- all positions overweight -> all suggested amounts become zero
- budget override exceeds the allowed total
- missing snapshot dates are filled once, not duplicated

## Style

Prefer readable, scenario-based tests with explicit numbers. The best financial tests make the setup and expected math obvious without requiring the reader to reverse-engineer the formula from the assertions.
