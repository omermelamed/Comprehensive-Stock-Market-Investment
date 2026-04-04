# Database and SQL style

## Schema naming

- table names should be plural and explicit
- primary keys should be `id`
- foreign keys should be named after the referenced entity, for example `transaction_id`
- timestamps should be explicit about semantics: `created_at`, `updated_at`, `executed_at`, `triggered_at`

## Migration style

Each migration should have one dominant purpose.
Examples:
- create transactions table
- add allocation drift index
- backfill snapshot source

Avoid combining unrelated schema work in one migration.

## Constraint posture

Use the database to protect invariant breaches that should never succeed.
Examples:
- non-negative quantity when the domain requires it
- enum-like check constraints when native enum use is not chosen
- unique date for daily snapshots

## Query posture

- select only columns that the use case needs
- index for real read paths, not imagined future paths
- prefer a clear query over a magical generic query builder
- document provider-specific SQL behavior in the repository, not in distant notes

## Decimal and time rules

- decide precision intentionally for money, quantity, and percentages
- store timestamps consistently and document zone assumptions at the boundary
- never let formatting rules decide storage precision
