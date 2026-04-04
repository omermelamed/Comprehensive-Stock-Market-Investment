---
paths:
  - "frontend/**/*.ts"
  - "frontend/**/*.tsx"
  - "frontend/**/*.css"
---

# React Vite Tailwind rules

## Default shape

- pages compose feature sections
- feature hooks own fetching and mutations
- presentational components remain mostly stateless
- UI primitives remove repeated Tailwind and semantic patterns

## Coding rules

- use strict TypeScript types
- keep API payload mapping outside of dense rendering components
- separate formatting helpers from domain calculations
- prefer explicit props over spreading large ambiguous objects

## UX rules

- deterministic data should be visually primary
- AI commentary should be secondary and clearly labeled
- validation should be shown close to the field and at confirmation when risk is higher
- use skeletons and progressive rendering instead of blocking the whole page

## Read before inventing a new UI pattern

- `.claude/context/frontend-guidelines.md`
- `.claude/context/frontend-style-react.md`
- `.claude/context/design-system.md`
- `.claude/skills/react-vite-tailwind/`
