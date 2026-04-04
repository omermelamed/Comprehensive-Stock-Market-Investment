# Investment Platform Monorepo

This repository is a local single-user investment platform built as a Kotlin + Spring Boot backend and a React + Vite frontend with PostgreSQL, jOOQ, and Flyway.

## Purpose

Build a practical personal investing workstation that answers one recurring question well: **"I have a monthly budget. What exactly should I buy this month?"** The software is allowed to be opinionated, deterministic, and simple because it serves one user on one machine.

## Core operating rules

- prefer the simplest correct design over enterprise abstractions
- keep the transaction ledger as the source of truth; never make a mutable holdings table authoritative
- derive holdings, allocation drift, performance, and monthly investment suggestions from transactions plus market data
- in the monthly investment flow, overweight positions always suggest `0`; the system never suggests selling
- AI is advisory only; AI does not own formulas, validation, transaction logging, or persistence decisions
- this is a local single-user app; do not add auth, sessions, Redis, queues, event buses, or microservices unless explicitly requested
- build in phases; phase 1 and 2 must work cleanly before heavier AI features are added
- before non-trivial edits, state the plan, touched files, and checks to run
- after edits, run the smallest relevant validation commands and report exact results
- never claim code, tests, migrations, or builds ran unless they actually ran

## Opinionated engineering posture

- choose explicit boundaries over magical convenience
- keep business calculations in pure, directly testable code
- keep files small enough that ownership is obvious from the filename
- avoid speculative abstractions, generic frameworks, or base classes unless duplication is already painful in real code
- use consistent naming and shape across layers so the same use case is easy to follow from UI to API to repository
- when uncertain, optimize for debuggability and reviewability rather than terseness

## Reasoning and token discipline

- load only the smallest relevant context for the current task
- reuse the topic files in `.claude/context/` instead of repeating the same product facts in every rule, skill, or agent
- prefer references and examples over long repeated prose
- keep deterministic formulas in backend code and reference files, not repeated across prompts
- summarize intent first, then inspect only the touched layer
- when touching one layer, do not eagerly load all other layers unless the change crosses a boundary

## Default workflow

1. restate the task in domain language
2. identify the smallest set of files that should change
3. inspect the relevant context package files
4. implement the smallest coherent diff
5. run focused validation
6. report what changed, what ran, and any follow-up risk

## Load the context package

@.claude/context/package.md

## Rule notes

- path-specific rules live in `.claude/rules/` and are loaded when matching files are touched
- nested `CLAUDE.md` files under `backend/`, `frontend/`, and migration directories add extra scoped context
- skills under `.claude/skills/` should be used for recurring workflows
- subagents under `.claude/agents/` should own implementation within their layer and hand off cleanly when a cross-layer change is required

## Repository startup assumptions

The repo may begin nearly empty. If a folder does not exist yet, create the smallest credible skeleton only when the requested task actually requires it. Avoid speculative directory explosions.
