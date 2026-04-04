# Import mapping guidance

Prefer explicit column mapping with preview.

Example source -> target mapping:
- `Ticker` -> `symbol`
- `Qty` -> `quantity`
- `Avg Cost` -> derived opening buy price only if the import flow explicitly supports bootstrapping from positions

Never silently guess between conflicting money or quantity columns.
