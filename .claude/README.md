# Claude setup README

This folder is a starter operating system for Claude Code inside this repository.

## Contents

- `context/` reusable product and engineering knowledge
- `rules/` path-scoped coding rules
- `skills/` workflow bundles for repeatable tasks
- `agents/` subagents for layer ownership
- `commands/` short entry points for common requests

## Why this structure exists

A good Claude setup should improve output quality **without** flooding the model with the whole project on every turn. The files here aim to:

- keep shared facts in one place
- make rules short and specific
- keep formulas and workflow details reusable
- help Claude inspect only the layer it is changing

## Update strategy

When the real codebase grows:

1. expand only the files that repeatedly prove useful
2. move repeated details from rules into shared context or references
3. add examples when Claude makes the same mistake twice
4. remove stale guidance quickly
