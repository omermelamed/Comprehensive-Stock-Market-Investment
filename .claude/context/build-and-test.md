# Build and test guidance

## Principle

Run the smallest relevant checks that prove the change is real.

## Backend examples

- compile or test one package if the change is narrow
- run a focused service or repository test when logic changes
- run wider suites only when contracts or infrastructure changed broadly

## Frontend examples

- typecheck after API shape or component prop changes
- run a focused test for a feature hook or component
- run lint only when it adds real confidence for the touched files

## Database examples

- validate Flyway migration naming and ordering
- ensure generated jOOQ code assumptions still hold
- run repository tests if schema semantics changed

## Reporting format

Always report:
- exact commands run
- whether they passed or failed
- any skipped checks and why

## Honesty rule

Never say "should pass" or "likely works" as a substitute for actual execution when a check was expected.
