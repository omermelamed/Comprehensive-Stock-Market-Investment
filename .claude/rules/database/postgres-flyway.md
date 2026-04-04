---
paths:
  - "backend/src/main/resources/db/migration/**/*.sql"
  - "backend/**/migration/**/*.sql"
---

# Postgres Flyway rules

## Migration posture

- one migration should have one dominant purpose
- prefer additive migrations and clear rollback thinking
- include constraints where they protect hard invariants
- keep destructive schema changes out unless explicitly requested

## Financial safety

- use deliberate precision and scale for money, quantity, and percentage fields
- document or encode uniqueness for one-row-per-day snapshots and similar invariants
- do not let migration shortcuts weaken ledger correctness

## Review checklist

Before accepting a migration, check:
- naming clarity
- nullability and defaults
- indexes for real queries
- effect on jOOQ generation
- compatibility with existing data

## References

- `.claude/context/database-guidelines.md`
- `.claude/context/database-style-sql.md`
- `.claude/skills/postgres-flyway-jooq/`
