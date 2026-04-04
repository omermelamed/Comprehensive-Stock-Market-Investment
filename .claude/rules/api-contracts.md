# API contract rules

## Contract posture

API payloads should be explicit, stable, and easy for the frontend to consume without guessing.

## Defaults

- separate request DTOs, response DTOs, and domain models
- use names that reflect business meaning, not transport accidents
- prefer additive contract changes over silent field repurposing
- keep finance-critical fields typed and named consistently across endpoints

## Change rule

When changing an API contract:
1. update backend DTOs and mapping
2. update contract tests if present
3. update frontend types or adapters
4. verify no old field semantics are now ambiguous

## Example

Prefer `suggestedAmount`, `remainingBudget`, and `isOverweight` over vague names like `value1`, `balance`, or `status`.
