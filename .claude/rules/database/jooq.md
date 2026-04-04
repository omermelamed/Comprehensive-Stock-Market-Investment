---
paths:
  - "backend/**/*.kt"
---

# jOOQ rules

## Usage posture

- keep jOOQ in repository or infrastructure code
- map records into domain types promptly
- write explicit queries for the fields a use case needs
- do not leak generated records into API or domain layers

## Style

- give repository methods business-level names, not SQL-level names only
- keep complex query logic readable with intermediate steps when needed
- prefer a second small repository method over one mega-query that hides meaning

## Avoid

- hand-editing generated jOOQ code
- building a fake ORM abstraction on top of jOOQ
- returning raw records to upper layers
