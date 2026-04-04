# Frontend source scoped context

Use this file for code under `frontend/src/`.

## What belongs here

- routes and pages
- feature components
- API hooks and client adapters
- state coordination for forms and tables
- chart and card presentation

## UX rules

- avoid implementing core formulas only in components
- validate user input for money, quantities, and percentages
- use skeleton states rather than blocking spinners where possible
- make over-budget states immediate and obvious
- keep AI commentary visually subordinate to deterministic metrics

## Component guidance

Prefer small components with clear responsibilities:
- input components for money and percentages
- card components for holdings and monthly suggestions
- hooks for fetching and mutation
- utility functions for formatting, not business rules

## Example

A position card can accept precomputed values such as `status`, `gapPercent`, `suggestedAmount`, and `aiSummary` from the API. It should not need to recreate the allocation formula internally.
