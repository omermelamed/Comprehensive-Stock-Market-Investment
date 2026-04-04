---
name: kotlin-spring-jooq
description: Provides opinionated backend implementation guidance for Kotlin, Spring Boot, and jOOQ in this monorepo. Use when editing controllers, services, repositories, schedulers, DTOs, validators, calculators, or backend tests, especially when Claude needs to choose the right layer and keep finance-critical logic explicit and testable.
---

# Kotlin Spring jOOQ

Use this skill for normal backend engineering work.

## Workflow

1. identify the use case in business language
2. choose the smallest layer that should own the change
3. keep deterministic rules in calculator or validator code
4. keep SQL in repositories and provider behavior in adapters
5. add or update focused tests for behavior changes

## Preferred shape

- controller -> request or response DTOs only
- application service -> orchestration and transaction boundaries
- pure domain calculators or validators -> finance rules and invariants
- jOOQ repositories -> SQL and persistence mapping
- integration clients -> market data and external APIs

## Decision rubric

Choose the smallest layer that can own the change cleanly.
- request parsing or status codes -> controller
- use-case orchestration -> service
- formulas and invariants -> calculator or validator
- SQL or projection loading -> repository
- provider fallback logic -> integration adapter
- recurring schedule trigger -> scheduler plus service

## Opinionated rules

- keep controllers thin
- use constructor injection
- keep domain math framework-light and directly testable
- keep jOOQ details out of API DTOs
- use `Clock` injection for time-based logic
- keep scheduled jobs idempotent
- prefer explicit domain names over generic names like `Processor` or `Util`
- prefer one cohesive service per use case over massive services with many responsibilities

## Example

For a snapshot catch-up flow:
- the scheduler decides when to run
- a service decides which days are missing
- a provider adapter fetches historical prices
- a repository persists snapshot rows
- a focused test proves that rerunning the same input does not duplicate rows

## Example anti-patterns

Avoid:
- controller calculates allocation gaps directly
- repository returns raw jOOQ records to controllers
- service silently rounds money values in multiple places
- calculator calls an AI client or HTTP provider

## References

- backend guidelines: [../..//context/backend-guidelines.md](../../context/backend-guidelines.md)
- backend style: [../../context/backend-style-kotlin.md](../../context/backend-style-kotlin.md)
- testing style: [../../context/testing-style.md](../../context/testing-style.md)
- backend patterns: [references/patterns.md](references/patterns.md)
- backend testing: [references/testing.md](references/testing.md)
