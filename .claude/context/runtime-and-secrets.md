# Runtime and secrets

## Local runtime

Assume local development first. Prefer a setup that can be started with minimal ceremony.

## Secrets

Keep API keys and provider secrets in environment files or local secret management, not in code or checked-in examples with real values.

## Provider assumptions

Possible runtime secrets include:
- database connection string
- market-data provider keys if used
- Claude API key

## Error posture

Failures from optional integrations should degrade gracefully where possible.
Examples:
- if AI summarization fails, deterministic monthly flow still works
- if the primary market provider fails, try the fallback chain before surfacing a hard failure
