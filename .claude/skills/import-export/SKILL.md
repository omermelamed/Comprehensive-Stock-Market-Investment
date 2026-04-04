---
name: import-export
description: Guides CSV and spreadsheet import or export work in this monorepo. Use when implementing transaction import, holdings bootstrap, export reports, column mapping, validation previews, or row-level error reporting while keeping ledger correctness and user feedback clear.
---

# Import export

Use this skill for ingest and file export behavior.

## Rules

- import validation must explain row-level failures clearly
- imported finance data should be normalized before persistence
- do not bypass normal ledger invariants for convenience
- export fields should reflect stable business semantics, not internal implementation details

## Example

A first-use holdings import can become initial buy transactions after mapping and validation rather than a separate hidden data path.

## References

- mapping: [references/mapping.md](references/mapping.md)
- transaction ledger: [../transaction-ledger/SKILL.md](../transaction-ledger/SKILL.md)
