# Backend coding style for Kotlin + Spring + jOOQ

## Package and type conventions

Prefer feature-oriented packaging once the project has real code:
- `api/` for controllers and request or response DTOs
- `application/` for use-case services
- `domain/` for calculators, validators, and domain models
- `infrastructure/` for jOOQ repositories and provider clients

Within a feature, keep the read path and write path easy to trace.

## Kotlin conventions

- use `data class` for immutable DTOs and simple domain state
- use `sealed interface` or `sealed class` for finite result states when that improves call-site clarity
- prefer expression-oriented code only when it stays readable
- avoid nullable chains for business decisions; branch explicitly
- keep extension functions local to a feature unless they are truly cross-cutting

## Service style

A service should read like a use-case script:
1. validate command shape
2. load required state
3. call pure validators or calculators
4. persist changes inside a transaction when needed
5. map to an outward-facing result

## Validation style

Separate request-shape validation from domain validation.
- request-shape validation: malformed IDs, missing fields, bad enum strings
- domain validation: cannot sell more than held, cannot exceed monthly budget, cannot create duplicate snapshot for a date

## Repository style

- keep SQL-centric concerns inside repositories
- prefer explicit selects over `selectFrom` when projections are narrower than the table
- map jOOQ records into domain types immediately; do not leak records up the stack
- keep one repository method focused on one query or persistence intent

## Time and money

- inject `Clock` anywhere time affects logic
- keep money as `BigDecimal` with explicit scale and rounding decisions near calculation boundaries
- never hide rounding in formatters or UI helpers

## Example

For `previewMonthlyInvestment(command)`:
- service loads holdings, targets, and prices
- calculator computes gap model and suggested allocations
- service maps result into API DTOs
- controller only handles HTTP input and output
