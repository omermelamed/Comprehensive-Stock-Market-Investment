# Frontend coding style for React + Vite + Tailwind

## Component layering

Prefer this order of responsibility:
- route or page: owns page composition and URL state
- feature container or hook: owns data fetching and action wiring
- presentational components: render props and callbacks only
- small primitives: buttons, cards, badges, inputs, table cells

## Component size

Split a component when it starts mixing three or more concerns such as:
- fetching or mutation state
- money or percentage formatting
- editable form state
- layout-heavy rendering
- AI explanation rendering

## State rules

- keep server state and local UI state distinct
- derive view-only state instead of duplicating it in multiple hooks
- keep transient editing state near the component that edits it
- reserve global state for truly shared cross-route concerns

## TypeScript style

- prefer precise domain names over generic `Item`, `Data`, or `Response`
- model API payloads exactly and map them into UI-friendly view models when needed
- avoid `any`; avoid wide unions without a discriminator

## Tailwind style

- favor reusable class patterns through wrapper components
- keep large class lists off dense business components when a small wrapper can remove repetition
- use color and motion to support meaning, not decoration

## Interaction defaults

- show deterministic numbers clearly before AI commentary
- keep the monthly allocation total visible while editing
- make invalid states obvious immediately
- keep destructive or irreversible actions behind an explicit confirmation step

## Example

A monthly flow page can be split into:
- `useMonthlyFlowPreview`
- `MonthlyBudgetInput`
- `AllocationSummaryFooter`
- `PositionAllocationCard`
- `ConfirmInvestmentDialog`
