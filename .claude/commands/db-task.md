---
argument-hint: [schema or migration task]
description: Design and implement a PostgreSQL and Flyway change with the database-agent and jOOQ-aware rules.
---

Use the `database-agent` subagent for this task:

$ARGUMENTS

## Required process

1. Read `@CLAUDE.md`, `@backend/CLAUDE.md`, and `@backend/src/main/resources/db/migration/CLAUDE.md` first.
2. Inspect `.claude/context/domain-invariants.md` before changing financial tables.
3. Use `postgres-flyway-jooq` and any other relevant domain skill.
4. After schema changes, address jOOQ regeneration implications and backend test impact.
5. Report migration intent, safety notes, and exact validation performed.
