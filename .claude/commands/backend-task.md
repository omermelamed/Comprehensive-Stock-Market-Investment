---
argument-hint: [backend task]
description: Implement a backend task with the backend-agent, Kotlin and Spring rules, and targeted backend validation.
---

Use the `backend-agent` subagent for this task:

$ARGUMENTS

## Required process

1. Read `@CLAUDE.md` and `@backend/CLAUDE.md` first.
2. Load only the backend-specific context files needed for the task.
3. Use relevant skills such as `kotlin-spring-jooq`, `portfolio-domain-logic`, or `monthly-investment-flow`.
4. If schema changes are needed, involve `database-agent`.
5. If the HTTP contract changes, involve `api-contract-reviewer`.
6. Run the smallest relevant backend checks before finishing.
7. Report files changed, commands run, results, and any follow-up work.
