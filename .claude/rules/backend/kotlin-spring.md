---
paths:
  - "backend/**/*.kt"
  - "backend/**/*.kts"
---

# Kotlin Spring rules

## Default shape

- controllers stay thin and HTTP-specific
- application services orchestrate use cases
- pure calculators and validators own finance rules
- repositories encapsulate jOOQ access and record mapping
- integration adapters isolate provider behavior

## Coding rules

- use constructor injection
- inject `Clock` for time-sensitive behavior
- keep DTOs, domain models, and persistence models intentionally separate
- make nullability and failure paths explicit
- prefer clear domain names over framework-centric names
- keep one public method per use case when possible

## Style rules

- avoid giant service classes that mix reads, writes, validation, and formatting
- avoid generic `Utils` or `Helper` dumping grounds
- prefer `BigDecimal` calculations in dedicated domain code with explicit rounding
- prefer explicit result types or exceptions with clear semantics over silent null returns

## Example

For a transaction creation flow:
- controller validates request shape
- service loads current exposure and calls validator
- validator enforces sell or cover limits
- repository persists the transaction
- mapper builds the response DTO

## Read before inventing a new pattern

- `.claude/context/backend-guidelines.md`
- `.claude/context/backend-style-kotlin.md`
- `.claude/context/testing-style.md`
- `.claude/skills/kotlin-spring-jooq/`
