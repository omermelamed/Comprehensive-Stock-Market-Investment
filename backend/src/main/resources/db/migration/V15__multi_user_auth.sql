-- V15: Multi-user authentication
-- Creates users table, wipes all single-user data, adds user_id to all tables

-- ============================================================
-- 1. Create the users table
-- ============================================================
CREATE TABLE users (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. Wipe all existing user data (fresh start)
-- ============================================================
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
    user_profile
CASCADE;

-- ============================================================
-- 3. Add user_id to all data tables
-- ============================================================
ALTER TABLE user_profile               ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
ALTER TABLE transactions                ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
ALTER TABLE target_allocations          ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
ALTER TABLE portfolio_snapshots         ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
ALTER TABLE alerts                      ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
ALTER TABLE watchlist                   ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
ALTER TABLE options_transactions        ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
ALTER TABLE risk_score_history          ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
ALTER TABLE ai_recommendation_cache     ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
ALTER TABLE monthly_investment_sessions ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
ALTER TABLE telegram_conversations      ADD COLUMN user_id UUID REFERENCES users(id);
ALTER TABLE telegram_scheduled_messages ADD COLUMN user_id UUID REFERENCES users(id);
ALTER TABLE telegram_pending_confirmations ADD COLUMN user_id UUID REFERENCES users(id);

-- ============================================================
-- 4. Update unique constraints to be per-user
-- ============================================================

-- user_profile: was single-row; now one per user
DROP INDEX idx_user_profile_single_row;
CREATE UNIQUE INDEX idx_user_profile_user ON user_profile (user_id);

-- target_allocations: symbol unique per user
DROP INDEX idx_target_allocations_symbol;
CREATE UNIQUE INDEX idx_target_allocations_symbol ON target_allocations (user_id, UPPER(symbol));

-- portfolio_snapshots: one per user per day
DROP INDEX idx_portfolio_snapshots_date;
CREATE UNIQUE INDEX idx_portfolio_snapshots_user_date ON portfolio_snapshots (user_id, date);

-- watchlist: symbol unique per user
DROP INDEX idx_watchlist_symbol;
CREATE UNIQUE INDEX idx_watchlist_symbol ON watchlist (user_id, UPPER(symbol));

-- ai_recommendation_cache: one per user
DROP INDEX idx_ai_cache_single;
CREATE UNIQUE INDEX idx_ai_cache_user ON ai_recommendation_cache (user_id);

-- ============================================================
-- 5. Drop outdated functions
-- ============================================================

-- Drop single-user allocation check function — meaningless in multi-user context
-- The 100% constraint is enforced at the application layer
DROP FUNCTION IF EXISTS check_total_allocation();

-- ============================================================
-- 6. Recreate views to include user_id
-- ============================================================

DROP VIEW IF EXISTS current_holdings;
CREATE VIEW current_holdings AS
SELECT
    user_id,
    symbol,
    track,
    SUM(
        CASE
            WHEN type IN ('BUY')    THEN quantity
            WHEN type IN ('SELL')   THEN -quantity
            WHEN type IN ('SHORT')  THEN -quantity
            WHEN type IN ('COVER')  THEN quantity
            ELSE 0
        END
    )                                                       AS net_quantity,
    SUM(
        CASE
            WHEN type IN ('BUY', 'SHORT')  THEN quantity * price_per_unit
            ELSE 0
        END
    ) /
    NULLIF(SUM(
        CASE
            WHEN type IN ('BUY', 'SHORT')  THEN quantity
            ELSE 0
        END
    ), 0)                                                   AS avg_buy_price,
    SUM(
        CASE
            WHEN type IN ('BUY', 'SHORT')  THEN quantity * price_per_unit
            WHEN type IN ('SELL', 'COVER') THEN -(quantity * price_per_unit)
            ELSE 0
        END
    )                                                       AS total_cost_basis,
    COUNT(*)                                                AS transaction_count,
    MIN(executed_at)                                        AS first_bought_at,
    MAX(executed_at)                                        AS last_transaction_at
FROM transactions
GROUP BY user_id, symbol, track
HAVING SUM(
    CASE
        WHEN type IN ('BUY')    THEN quantity
        WHEN type IN ('SELL')   THEN -quantity
        WHEN type IN ('SHORT')  THEN -quantity
        WHEN type IN ('COVER')  THEN quantity
        ELSE 0
    END
) > 0;

DROP VIEW IF EXISTS active_options;
CREATE VIEW active_options AS
SELECT
    user_id,
    id,
    underlying_symbol,
    option_type,
    action,
    strike_price,
    expiration_date,
    contracts,
    premium_per_contract,
    total_premium,
    (expiration_date - CURRENT_DATE)    AS days_to_expiry,
    status,
    executed_at
FROM options_transactions
WHERE status = 'ACTIVE'
ORDER BY expiration_date;

DROP VIEW IF EXISTS active_alerts;
CREATE VIEW active_alerts AS
SELECT
    user_id,
    id,
    symbol,
    condition,
    threshold_price,
    note,
    created_at
FROM alerts
WHERE is_active = TRUE;

-- Recreate upcoming_scheduled_messages view
DROP VIEW IF EXISTS upcoming_scheduled_messages;
CREATE VIEW upcoming_scheduled_messages AS
    SELECT * FROM telegram_scheduled_messages
    WHERE is_active = TRUE AND next_send_at <= NOW();
