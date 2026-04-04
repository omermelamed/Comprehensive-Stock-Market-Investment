---
paths:
  - "backend/src/test/**/*.kt"
  - "backend/**/*.kt"
---

# Backend testing rules

## Test what matters first

- pure calculators and validators
- repository SQL behavior that could silently drift
- controller or integration boundaries for serialization and status codes
- scheduler idempotency and missing-date selection

## Style

- use descriptive business-focused test names
- keep one scenario per test when practical
- prefer focused fixtures over giant object graphs
- assert exact decimal outcomes for finance rules

## Minimum expectation

When changing behavior, add or update the smallest relevant tests instead of relying only on manual reasoning.

## See also

- `.claude/context/testing-style.md`
- `.claude/skills/kotlin-spring-jooq/references/testing.md`
