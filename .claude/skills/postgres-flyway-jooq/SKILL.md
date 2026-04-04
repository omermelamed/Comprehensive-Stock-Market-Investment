---
name: postgres-flyway-jooq
description: Provides opinionated database change guidance for PostgreSQL, Flyway, and jOOQ in this monorepo. Use when creating or editing schema migrations, adding constraints or indexes, changing financial column precision, or updating repositories to match schema evolution while preserving ledger correctness and jOOQ generation boundaries.
---

# Postgres Flyway jOOQ

Use this skill for schema work and persistence-layer changes.

## Workflow

1. define the invariant or query need that motivates the schema change
2. create the smallest migration with one dominant purpose
3. check nullability, precision, constraints, and indexes deliberately
4. ensure repository code and jOOQ generation expectations still make sense
5. document any data backfill or safety implications

## Opinionated rules

- migrations should be additive unless a destructive change is explicitly requested
- financial columns need deliberate precision and scale
- protect hard invariants with constraints where practical
- keep schema naming stable and readable
- do not hand-edit generated jOOQ classes

## Examples

Good migration scopes:
- create `transactions`
- add unique constraint for one snapshot per date
- add index for transaction lookup by symbol and execution time

Bad migration scopes:
- create three unrelated tables, rename old fields, and add a backfill in one file

## Anti-patterns

Avoid:
- using vague numeric types for money
- adding indexes without a query reason
- weakening constraints because the application "should handle it"

## References

- database guidelines: [../../context/database-guidelines.md](../../context/database-guidelines.md)
- database style: [../../context/database-style-sql.md](../../context/database-style-sql.md)
- migration checklist: [references/migration-checklist.md](references/migration-checklist.md)
- schema rules: [references/schema-rules.md](references/schema-rules.md)
