# Project overview

## Product summary

Build a personal investment portfolio platform for one user on one machine. The platform combines manual transaction entry, live market data, historical snapshots, and guided monthly allocation decisions.

## Primary user problem

The product should answer: **"I have a fixed amount to invest this month. What exactly should I buy?"**

## Product priorities

1. trustworthy transaction ledger
2. correct holdings and allocation math
3. fast dashboard and clear portfolio state
4. smooth monthly investment flow
5. AI enrichment only after deterministic foundations are solid

## Runtime model

- local application
- single user
- no auth by default
- no distributed systems assumptions
- optional Docker, but direct local runs should stay simple

## Stack

- backend: Kotlin, Spring Boot, jOOQ, Flyway, PostgreSQL
- frontend: React, TypeScript, Vite, Tailwind
- scheduler: Spring scheduling
- market data: Yahoo Finance with fallback providers
- AI: Claude API for explanations and recommendation summaries

## Practical interpretation

When making tradeoffs:
- choose clarity over extensibility theater
- choose explicitness over meta-frameworks
- choose a vertical slice that works over ambitious architecture that is not yet needed

## Reference documents

- Full PRD v1.4: `.claude/context/prd-v1.4.md`
- Build phases (completed + remaining): `.claude/context/phasing-and-ai.md`
