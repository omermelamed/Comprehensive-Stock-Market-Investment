# Testing style

## Testing hierarchy

- test pure calculations and validators first
- add repository tests for tricky SQL and mapping behavior
- add controller or integration tests for boundary behavior and serialization
- avoid overusing full-stack tests for cases that a small unit test can prove faster

## What deserves tests here

- gap calculation and monthly allocation distribution
- overweight positions returning zero suggested allocation
- sell and cover validation
- snapshot catch-up date selection and idempotency
- CSV mapping and validation edge cases
- API contract fields that drive the frontend

## Test naming

Use descriptive test names that encode business meaning.
Examples:
- `returnsZeroSuggestionForOverweightPosition`
- `blocksSellWhenQuantityExceedsCurrentHoldings`
- `createsMissingSnapshotsOnlyForAbsentDates`

## Assertion style

- assert the behavior that matters, not incidental implementation details
- prefer one focused scenario per test
- for decimals, assert exact expected values or intentionally rounded values
