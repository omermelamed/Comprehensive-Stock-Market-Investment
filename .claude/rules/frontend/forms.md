---
paths:
  - "frontend/**/*Form*.tsx"
  - "frontend/**/*Input*.tsx"
  - "frontend/**/*Dialog*.tsx"
---

# Form rules

## Form behavior

- keep field names aligned with backend DTO names when that improves clarity
- parse and validate money, quantities, and percentages explicitly
- preserve user input while showing validation feedback
- prefer controlled abstractions only when they reduce real repetition

## Error messaging

- make messages actionable
- explain the violated rule in domain language
- keep confirmation dialogs explicit for irreversible or finance-critical actions

## Avoid

- hidden coercions that silently change money values
- generic invalid-form messages with no field context
