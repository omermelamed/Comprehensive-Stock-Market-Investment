# Kotlin source scoped context

Use this file for code under `backend/src/main/kotlin/`.

## What belongs here

- controllers and DTOs
- application services
- domain calculators and validators
- repository implementations
- integration adapters
- scheduler entry points

## Coding priorities

- keep classes small and intention-revealing
- keep financial rules easy to test outside Spring where practical
- inject `Clock` instead of calling system time directly
- separate transport models, domain projections, and persistence records
- keep provider fallbacks and retry logic in dedicated adapters

## Patterns to prefer

### Good shape
- controller accepts request
- service orchestrates
- validator or calculator applies rules
- repository persists or fetches projections
- mapper builds DTO

### Avoid
- controller performing gap math directly
- repository returning generated jOOQ records into the API layer
- static time calls buried in business logic

## Example

A `MonthlyInvestmentPreviewService` can depend on a `HoldingProjectionRepository`, `TargetAllocationRepository`, `PriceQuoteService`, and `MonthlyAllocationCalculator`. That keeps the formula path testable and the HTTP layer thin.
