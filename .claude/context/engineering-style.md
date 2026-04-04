# Engineering style

This project favors a staff-level, low-drama engineering style: deterministic behavior, explicit boundaries, and code that is easy to review in small diffs.

## Decision hierarchy

1. preserve domain correctness
2. preserve clarity of ownership
3. preserve debuggability
4. optimize only when a hotspot is known

## Default coding posture

- prefer explicit names over clever compression
- prefer one obvious path over many extension points
- prefer composition over inheritance
- prefer a small number of boring patterns repeated consistently
- prefer pure functions for calculations and validation
- prefer immutable data flow at service boundaries
- prefer a direct implementation now over a speculative abstraction for later

## File and function shape

- one file should usually answer one question
- a function should have one dominant reason to change
- split when a file mixes HTTP concerns, domain rules, SQL, and formatting
- avoid utility dumping grounds; place helpers next to the feature that needs them

## Comments and docs

- do not narrate obvious code
- add comments only for invariants, non-obvious tradeoffs, or external API quirks
- when a rule is business-critical, encode it in tests and constraints, not only prose

## Error handling

- fail loudly at boundaries, not silently in the middle
- return actionable validation messages for user-facing flows
- keep internal error messages structured enough to debug provider and data issues

## Review bar

A change is high quality when a reviewer can answer all of these quickly:
- what domain rule changed
- where that rule lives now
- how it is tested
- what assumptions were kept intentionally out of scope

## Avoid

- broad base classes and framework-heavy indirection
- flag arguments that create many hidden branches
- boolean soup in DTOs
- copy-pasting the same domain rule into controller, frontend, and SQL
- TODO-driven design that leaves core behavior ambiguous
