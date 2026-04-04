# Migration scoped context

Use this file for Flyway work under `backend/src/main/resources/db/migration/`.

## Migration priorities

- protect ledger correctness
- preserve auditability
- keep schema evolution understandable
- think through jOOQ generation impact

## Checklist

- does the migration preserve the transaction-ledger source of truth?
- are decimal precision and nullability correct for finance data?
- does the change need a backfill or data migration step?
- are indexes needed for dashboard, holdings, or snapshot queries?
- will repository code or generated jOOQ classes need follow-up changes?

## Avoid

- destructive edits without explicit request
- casual type changes for money or quantity columns
- ambiguous timestamp semantics

## Example

If adding `snapshot_source`, ensure the database representation is explicit, existing rows have a safe interpretation, and service code can distinguish scheduled from catch-up snapshots clearly.
