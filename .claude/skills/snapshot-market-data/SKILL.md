---
name: snapshot-market-data
description: Guides implementation of daily snapshot and market data workflows in this monorepo. Use when building scheduled snapshot jobs, catch-up logic, provider fallback chains, historical price loading, or portfolio history persistence, especially where idempotency and missing-date handling matter.
---

# Snapshot market data

Use this skill for scheduled value snapshots and provider-backed history loading.

## Workflow

1. determine whether the task is daily snapshot creation or startup catch-up
2. compute the exact dates that need data
3. fetch prices through a provider adapter or fallback chain
4. persist one snapshot row per required date
5. keep reruns safe and visible

## Rules

- snapshot creation must be idempotent
- catch-up logic should work from explicit missing dates, not vague time ranges
- schedulers decide when to trigger, not how to calculate business behavior
- provider fallback chains must be explicit and observable

## Example

For startup catch-up:
- load the most recent snapshot date
- build the list of missing dates up to yesterday
- fetch historical price data
- create only the absent snapshot rows

## References

- backend style: [../../context/backend-style-kotlin.md](../../context/backend-style-kotlin.md)
- job rules: [references/job-rules.md](references/job-rules.md)
- fallback chain: [references/fallback-chain.md](references/fallback-chain.md)
