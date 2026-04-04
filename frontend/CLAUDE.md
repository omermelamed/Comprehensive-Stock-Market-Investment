# Frontend scoped context

Use this file when working anywhere under `frontend/`.

## Purpose

The frontend should present portfolio state clearly and make the monthly investment flow feel fast and controllable without owning the authoritative finance rules.

## Priorities

- clear numbers and status cues
- strong loading and empty states
- smooth editing of monthly allocation amounts
- explicit confirmation before writes
- AI text as a secondary explanatory layer

## Structural defaults

- feature-oriented component organization
- hooks for fetching and view-state coordination
- dedicated API modules
- reusable display components for badges, cells, cards, and totals

## Example

A monthly flow screen should compose budget input, position cards, running total, and confirmation summary from focused components rather than one massive page component.
