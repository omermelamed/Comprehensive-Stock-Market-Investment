---
paths:
  - "frontend/**/*Monthly*"
  - "frontend/**/*Allocation*"
  - "frontend/**/*Budget*"
  - "frontend/**/*Invest*"
---

# Monthly flow UI rules

## Interaction priorities

- keep the monthly budget, allocated amount, and remaining amount visible while editing
- overweight positions should visually communicate "no action needed" and default to zero
- user edits may override suggestions, but the UI must keep totals and validation clear
- AI summaries support the decision; they do not replace the numbers

## Component shape

Split large screens into:
- budget input
- position card list
- running total footer
- confirmation dialog

## Safety rules

- do not hide overspend states
- do not let confirmation proceed without backend revalidation
- do not bury the reason a suggestion is zero when the position is overweight
