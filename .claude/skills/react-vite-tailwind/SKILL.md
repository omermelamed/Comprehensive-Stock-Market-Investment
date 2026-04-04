---
name: react-vite-tailwind
description: Provides opinionated frontend guidance for React, TypeScript, Vite, and Tailwind in this monorepo. Use when implementing pages, feature components, hooks, form flows, tables, confirmation dialogs, loading states, or financial dashboards, especially when Claude needs to keep deterministic numbers primary and UI state separated from backend truth.
---

# React Vite Tailwind

Use this skill for frontend implementation and refactoring work.

## Workflow

1. identify the page or feature responsibility
2. separate page composition from data fetching and rendering
3. keep domain calculations minimal on the client and revalidate on the server
4. expose validation and totals clearly in the UI
5. keep AI-generated text secondary to deterministic values

## Preferred structure

- page or route -> layout and composition
- feature hook -> query or mutation wiring
- presentational components -> pure rendering with callbacks
- small UI primitives -> shared style and semantics

## Opinionated rules

- keep API mapping out of large rendering components
- prefer explicit prop types and view models
- split components before they mix fetching, formatting, editing, and layout all at once
- keep money, percentage, and quantity formatting centralized
- prefer reusable wrappers over repeating dense Tailwind class strings in business components

## Monthly flow example

A healthy monthly flow screen often looks like:
- `useMonthlyFlowPreview` for backend communication and local editing state
- `MonthlyBudgetInput` for budget entry
- `PositionAllocationCard` for each position
- `AllocationSummaryFooter` for live totals
- `ConfirmInvestmentDialog` for the final confirmation

## Anti-patterns

Avoid:
- embedding core allocation formulas deep in components
- letting AI text visually dominate the numeric decision data
- keeping the remaining budget calculation in three separate components
- one page component that owns every query, table row, dialog, and formatter

## References

- frontend guidelines: [../../context/frontend-guidelines.md](../../context/frontend-guidelines.md)
- frontend style: [../../context/frontend-style-react.md](../../context/frontend-style-react.md)
- design system: [../../context/design-system.md](../../context/design-system.md)
- ui patterns: [references/ui-patterns.md](references/ui-patterns.md)
- page checklist: [references/page-checklist.md](references/page-checklist.md)
