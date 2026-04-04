# Architecture rules

## Architectural shape

Default to a modular monorepo with clear backend, frontend, and database ownership.

## Backend

- controllers own HTTP only
- services own orchestration and transaction boundaries
- domain calculators and validators own business rules
- repositories own jOOQ queries and mapping
- provider clients own external API quirks and fallback behavior

## Frontend

- pages compose features
- feature hooks own data fetching and mutations
- presentational components render props and callbacks
- local UI state stays near the interaction that needs it

## Database

- Flyway owns schema evolution
- PostgreSQL constraints protect invariants that should never succeed incorrectly
- jOOQ is generated from the schema; generated code is never hand-edited

## Cross-layer rule

If a change touches more than one layer, keep the contract explicit and change the layers in this order when possible:
1. schema or repository shape
2. backend contract
3. frontend integration
4. AI explanation or recommendation layer
