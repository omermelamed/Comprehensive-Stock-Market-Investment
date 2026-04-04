---
name: api-contract-sync
description: Keeps backend and frontend API contracts aligned in this monorepo. Use when request or response DTOs change, new endpoints are added, field semantics evolve, or Claude needs to update backend mapping and frontend types together without letting finance-critical payload meaning drift.
---

# API contract sync

Use this skill whenever a contract change crosses the backend/frontend boundary.

## Workflow

1. identify the business meaning of the changed field or endpoint
2. update backend DTOs and mapping first
3. update frontend types or adapters second
4. check naming and nullability for ambiguity
5. verify that numeric fields still mean the same thing across layers

## Rules

- keep request DTOs, response DTOs, and domain models separate
- prefer additive changes over semantic repurposing
- use business names that explain the field without reading implementation code
- keep numbers, percentages, and booleans unambiguous

## Example

If monthly flow starts returning `remainingBudget`, also make sure the frontend stops recomputing an incompatible value under a different name.

## References

- api contracts: [../../context/api-and-contracts.md](../../context/api-and-contracts.md)
- checklist: [references/checklist.md](references/checklist.md)
