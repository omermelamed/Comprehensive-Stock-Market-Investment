# Phasing and AI

## Build order

Respect this rough sequence:

1. transaction entry and dashboard
2. target allocation setup and monthly investment flow without AI
3. AI summaries for monthly flow
4. watchlist analysis
5. recommendation engine
6. chatbot
7. performance and risk analytics
8. options tracking

## AI principle

AI should enrich judgment, not replace the deterministic core.

## Practical rule

If a feature depends on both financial formulas and AI commentary:
- build the formula path first
- expose the raw deterministic output cleanly
- add AI text as an optional layer on top

## Example

For the monthly flow, the model may say:
"You are underweight in VOO and current valuation signals look acceptable."
But the exact amount suggested must come from the formula engine, not from the model.
