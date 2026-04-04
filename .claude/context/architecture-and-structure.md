# Architecture and structure

## Monorepo shape

Expected top-level layout:

- `backend/` Kotlin + Spring Boot app
- `frontend/` React + Vite app
- shared `.claude/` guidance

## Backend shape

Preferred backend layering:

1. API layer: controllers, request parsing, response shaping
2. Application services: orchestration, transaction boundaries, use-case flows
3. Domain calculators: deterministic rules, formulas, validations
4. Repositories: jOOQ queries and mapping
5. Integrations: market-data clients, AI adapter, scheduler entry points

Keep domain math testable and framework-light.

## Frontend shape

Preferred frontend layering:

1. routes or pages
2. feature components
3. hooks for state and server interaction
4. API client modules
5. presentational UI primitives

Avoid putting portfolio formulas directly into components.

## Database shape

- Flyway owns schema evolution
- jOOQ codegen mirrors the live schema
- SQL lives near repository ownership
- database constraints should enforce obvious invariants where practical

## Cross-layer principle

For any financial rule, the backend is the authority. The frontend may mirror the rule for UX feedback, but the backend must validate it again.
