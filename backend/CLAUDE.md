# Backend scoped context

Use this file when working anywhere under `backend/`.

## Purpose

The backend is the authority for:
- transaction recording
- holdings derivation
- target allocation math
- monthly flow suggestion calculation
- snapshot creation and catch-up
- final validation before writes

## Architectural defaults

- Spring Boot with constructor injection
- jOOQ for persistence
- Flyway for schema changes
- pure or near-pure calculators for financial formulas
- `Clock` injection for time-aware logic

## What to keep out of controllers

- gap calculations
- sell or cover validation logic
- snapshot deduplication logic
- provider fallback chains

## Expected code shape

A new backend feature usually touches:
- one request or response DTO
- one service or use-case coordinator
- one calculator or validator if domain math is involved
- one repository if data access changes
- targeted tests

## Example

For monthly flow preview, avoid one giant controller method. Prefer a service that loads inputs, a calculator that computes suggestions, and a mapper that shapes response cards.
