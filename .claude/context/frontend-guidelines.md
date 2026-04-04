# Frontend guidelines

## Structural defaults

- use React function components and hooks
- keep API access in dedicated modules or feature hooks
- treat backend data as authoritative for finance-critical values
- use TypeScript strictly and keep prop types explicit
- prefer reusable feature components over page-level copy-paste

## UX defaults

- use optimistic feel only when correctness is not at risk
- use skeleton loading states rather than disruptive global spinners
- keep money inputs, percentage inputs, and confirmation flows explicit
- surface validation errors near the edited field and again at confirmation if needed

## Monthly flow interpretation

The UI should feel interactive, but should not become the only place where budget math exists. Local calculations are for responsiveness; server validation remains final.

## Avoid

- embedding core portfolio formulas deep inside components
- mixing formatting, fetching, and calculation in one giant component
- making AI text appear authoritative over deterministic numbers
