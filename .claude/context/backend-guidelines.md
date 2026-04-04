# Backend guidelines

## Structural defaults

- use Spring Boot with constructor injection
- use jOOQ for persistence
- do not introduce JPA or Hibernate
- keep controllers thin
- put business rules in application services and pure domain calculators
- inject `Clock` for time-dependent logic
- keep market-data clients behind interfaces
- scheduled jobs must be idempotent
- prefer transactions around multi-step persistence changes

## Code shape

A healthy backend change often looks like this:

- controller parses input and returns DTOs
- service coordinates repositories, market data, and calculators
- calculator performs gap math or validation
- repository executes SQL through jOOQ

## Example

For monthly flow preview:
- controller: accept budget
- service: load target allocations, holdings, and prices
- calculator: compute gaps and suggestions
- mapper: build position card DTOs

## Avoid

- fat controllers
- hidden time calls in business logic
- API DTOs coupled to generated jOOQ types
- AI clients inside calculators
