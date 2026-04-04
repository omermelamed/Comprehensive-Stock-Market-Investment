# Database guidelines

## Database philosophy

The database should make the correct thing easy and the dangerous thing obvious.

## Defaults

- use Flyway for all schema changes
- use PostgreSQL features deliberately, not accidentally
- keep money and quantity columns typed consistently
- prefer explicit constraints and indexes where they add real protection or speed
- keep schema naming clear and stable

## jOOQ relationship

- schema changes should consider the generated jOOQ model
- do not hand-edit generated classes
- keep repository mapping explicit when translating records into domain models

## Migration posture

- migrations should be additive and understandable
- avoid destructive changes unless explicitly requested
- when backfills are needed, explain safety and runtime implications

## Financial data caution

Be precise about decimal scale, nullability, and timestamp semantics. Small schema mistakes can quietly corrupt portfolio calculations.
