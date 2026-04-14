-- Phase 15: risk score history table
CREATE TYPE risk_score_trigger_enum AS ENUM ('MANUAL', 'AUTO', 'ONBOARDING');

CREATE TABLE risk_score_history (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_level                  risk_level_enum NOT NULL,
    ai_inferred_score           NUMERIC(4,3) CHECK (ai_inferred_score >= 0.000 AND ai_inferred_score <= 1.000),
    reasoning                   TEXT NOT NULL DEFAULT '',
    trigger                     risk_score_trigger_enum NOT NULL,
    transaction_count_at_update INTEGER NOT NULL DEFAULT 0,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backfill one row from existing profile so history starts at onboarding state
INSERT INTO risk_score_history (risk_level, ai_inferred_score, reasoning, trigger, transaction_count_at_update, created_at)
SELECT
    risk_level,
    ai_inferred_score,
    'Initial profile setup' AS reasoning,
    'ONBOARDING'::risk_score_trigger_enum,
    0,
    created_at
FROM user_profile
WHERE risk_level IS NOT NULL;
