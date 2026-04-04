---
name: transaction-ledger
description: Guides transaction-ledger behavior in this monorepo. Use when implementing transaction entry, holdings derivation, buy or sell validation, average cost calculations, import normalization, or any feature that depends on the ledger remaining the single source of truth for portfolio state.
---

# Transaction ledger

The ledger is the foundation of the product. Use this skill when a change could affect how holdings are derived.

## Rules

- transactions are the source of truth
- do not create a mutable holdings table as an authority shortcut
- validate sell and cover operations against derived current exposure
- keep derivation logic centralized and testable

## Example

A position view may cache or project derived holdings for read performance later, but the authoritative business logic must still be reconstructable from transactions.

## References

- domain invariants: [../../context/domain-invariants.md](../../context/domain-invariants.md)
- calculations: [references/calculations.md](references/calculations.md)
