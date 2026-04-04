---
paths:
  - "backend/**/*Scheduler*.kt"
  - "backend/**/*Job*.kt"
  - "backend/**/*Snapshot*.kt"
---

# Scheduler rules

## Job design

- scheduler classes decide when to run, not the business logic details
- services decide what work is required
- jobs must be safe to rerun without corrupting data
- time should come from injected `Clock`

## Snapshot-specific rules

- create at most one snapshot per date
- catch-up logic should compute missing dates explicitly
- provider fallback logic belongs in adapters or services, not in the scheduler trigger

## Logging and failure

- log enough context to debug which dates and provider path were used
- fail visibly when historical data is missing or partial; do not silently mark success

## References

- `.claude/context/backend-style-kotlin.md`
- `.claude/skills/snapshot-market-data/`
