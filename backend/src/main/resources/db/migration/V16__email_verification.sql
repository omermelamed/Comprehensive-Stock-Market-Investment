-- V16: Email verification and password reset
-- Wipes all users (agreed: early production, clean slate)
-- Renames username → email, adds email_verified, creates verification_tokens

-- 1. Wipe all existing data
TRUNCATE TABLE
    telegram_pending_confirmations,
    telegram_scheduled_message_log,
    telegram_scheduled_messages,
    telegram_conversations,
    risk_score_history,
    ai_recommendation_cache,
    monthly_investment_sessions,
    options_transactions,
    alerts,
    watchlist,
    portfolio_snapshots,
    transactions,
    target_allocations,
    user_profile,
    users
CASCADE;

-- 2. Alter users table: username → email, add email_verified
ALTER TABLE users RENAME COLUMN username TO email;
ALTER TABLE users ALTER COLUMN email TYPE VARCHAR(255);
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Create verification_tokens table
CREATE TABLE verification_tokens (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      VARCHAR(64)  NOT NULL UNIQUE,
    token_type VARCHAR(20)  NOT NULL CHECK (token_type IN ('VERIFY_EMAIL', 'RESET_PASSWORD')),
    expires_at TIMESTAMP    NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_verification_tokens_token ON verification_tokens (token);
CREATE INDEX idx_verification_tokens_expires ON verification_tokens (expires_at);
CREATE INDEX idx_verification_tokens_user_type ON verification_tokens (user_id, token_type);
