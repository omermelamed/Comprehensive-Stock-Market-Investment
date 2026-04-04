-- =============================================================================
-- Investment Portfolio Platform — Database Schema
-- PostgreSQL 15+
-- Run this file once to initialize the database
-- All tables use UUIDs as primary keys
-- All ENUM types are created first, then tables
-- =============================================================================


-- =============================================================================
-- EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- enables gen_random_uuid()


-- =============================================================================
-- ENUM TYPES
-- =============================================================================

CREATE TYPE risk_level_enum AS ENUM (
    'CONSERVATIVE',
    'MODERATE',
    'AGGRESSIVE'
);

CREATE TYPE transaction_type_enum AS ENUM (
    'BUY',
    'SELL',
    'SHORT',
    'COVER'
);

CREATE TYPE track_enum AS ENUM (
    'LONG',
    'SHORT',
    'CRYPTO'
);

CREATE TYPE asset_type_enum AS ENUM (
    'ETF',
    'STOCK',
    'BOND',
    'REIT',
    'CRYPTO'
);

CREATE TYPE snapshot_source_enum AS ENUM (
    'SCHEDULED',
    'CATCHUP'
);

CREATE TYPE alert_condition_enum AS ENUM (
    'ABOVE',
    'BELOW'
);

CREATE TYPE option_type_enum AS ENUM (
    'CALL',
    'PUT'
);

CREATE TYPE option_action_enum AS ENUM (
    'BUY',
    'SELL'
);

CREATE TYPE option_status_enum AS ENUM (
    'ACTIVE',
    'EXPIRED',
    'EXERCISED',
    'CLOSED'
);

CREATE TYPE watchlist_signal_enum AS ENUM (
    'GOOD_BUY_NOW',
    'NOT_YET',
    'WAIT_FOR_DIP',
    'PENDING'
);

CREATE TYPE ai_sentiment_enum AS ENUM (
    'POSITIVE',
    'NEUTRAL',
    'CAUTIOUS'
);


-- =============================================================================
-- TABLE: user_profile
-- Single row — all settings entered by the user during onboarding.
-- Nothing hardcoded. Every field is set by the user.
-- =============================================================================

CREATE TABLE user_profile (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic info (Step 1 of onboarding)
    display_name            VARCHAR(100)    NOT NULL,
    preferred_currency      VARCHAR(10)     NOT NULL,           -- e.g. 'ILS', 'USD', 'EUR'

    -- Risk profile (Step 2 of onboarding)
    risk_level              risk_level_enum NOT NULL,
    time_horizon_years      INTEGER         NOT NULL CHECK (time_horizon_years > 0),
    monthly_investment_min  DECIMAL(15, 2)  NOT NULL CHECK (monthly_investment_min >= 0),
    monthly_investment_max  DECIMAL(15, 2)  NOT NULL CHECK (monthly_investment_max >= monthly_investment_min),
    investment_goal         TEXT            NOT NULL,           -- user's own words

    -- Enabled tracks (multi-select from onboarding)
    -- Stored as JSONB array e.g. ["LONG", "REIT", "BOND"]
    tracks_enabled          JSONB           NOT NULL DEFAULT '[]',

    -- Raw questionnaire answers stored for reference and AI context
    questionnaire_answers   JSONB           NOT NULL DEFAULT '{}',

    -- AI-inferred risk score — updated automatically over time
    -- 0.0 = most conservative, 1.0 = most aggressive
    ai_inferred_score       DECIMAL(4, 3)   CHECK (ai_inferred_score BETWEEN 0.0 AND 1.0),

    -- UI preference
    theme                   VARCHAR(10)     NOT NULL DEFAULT 'DARK' CHECK (theme IN ('DARK', 'LIGHT')),

    -- Onboarding gate — app redirects to onboarding until this is true
    onboarding_completed    BOOLEAN         NOT NULL DEFAULT FALSE,

    created_at              TIMESTAMP       NOT NULL DEFAULT NOW(),
    last_updated            TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- Trigger function for tables with last_updated column (user_profile)
CREATE OR REPLACE FUNCTION update_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for tables with updated_at column (target_allocations, alerts, watchlist)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_profile_updated
    BEFORE UPDATE ON user_profile
    FOR EACH ROW EXECUTE FUNCTION update_last_updated();

-- Constraint: only one profile row allowed (single-user app)
CREATE UNIQUE INDEX idx_user_profile_single_row ON user_profile ((TRUE));


-- =============================================================================
-- TABLE: target_allocations
-- The user's desired portfolio allocation — defined during onboarding,
-- editable at any time. Foundation of the Monthly Investment Flow.
-- Constraint: sum of all target_percentage must equal 100.
-- =============================================================================

CREATE TABLE target_allocations (
    id                  UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol              VARCHAR(20)         NOT NULL,
    asset_type          asset_type_enum     NOT NULL,
    target_percentage   DECIMAL(5, 2)       NOT NULL CHECK (target_percentage > 0 AND target_percentage <= 100),
    label               VARCHAR(100)        NOT NULL,   -- user-friendly name e.g. "US Market"
    display_order       INTEGER             NOT NULL DEFAULT 0,  -- controls card order in UI
    created_at          TIMESTAMP           NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP           NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_target_allocations_updated
    BEFORE UPDATE ON target_allocations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Note: symbol uniqueness is enforced here — same symbol cannot appear twice
CREATE UNIQUE INDEX idx_target_allocations_symbol ON target_allocations (UPPER(symbol));

-- Note: the 100% sum constraint is enforced at the application layer (onboarding UI)
-- and verified via a database function below

-- Function to check total allocation sums to 100
CREATE OR REPLACE FUNCTION check_total_allocation()
RETURNS BOOLEAN AS $$
DECLARE
    total DECIMAL;
BEGIN
    SELECT COALESCE(SUM(target_percentage), 0) INTO total FROM target_allocations;
    RETURN total = 100.00;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- TABLE: transactions
-- Source of truth for all portfolio data.
-- Holdings are ALWAYS derived from this table — never stored separately.
-- =============================================================================

CREATE TABLE transactions (
    id              UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol          VARCHAR(20)             NOT NULL,
    type            transaction_type_enum   NOT NULL,
    track           track_enum              NOT NULL,
    quantity        DECIMAL(18, 8)          NOT NULL CHECK (quantity > 0),
    price_per_unit  DECIMAL(18, 8)          NOT NULL CHECK (price_per_unit > 0),
    total_value     DECIMAL(18, 2)          GENERATED ALWAYS AS (quantity * price_per_unit) STORED,
    notes           TEXT,
    executed_at     TIMESTAMP               NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMP               NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_transactions_symbol          ON transactions (UPPER(symbol));
CREATE INDEX idx_transactions_executed_at     ON transactions (executed_at DESC);
CREATE INDEX idx_transactions_track           ON transactions (track);
CREATE INDEX idx_transactions_symbol_type     ON transactions (UPPER(symbol), type);


-- =============================================================================
-- TABLE: options_transactions
-- Tracks options positions separately due to their unique structure.
-- Only relevant if user has OPTIONS track enabled.
-- =============================================================================

CREATE TABLE options_transactions (
    id                      UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    underlying_symbol       VARCHAR(20)         NOT NULL,
    option_type             option_type_enum    NOT NULL,
    action                  option_action_enum  NOT NULL,
    strike_price            DECIMAL(10, 2)      NOT NULL CHECK (strike_price > 0),
    expiration_date         DATE                NOT NULL,
    contracts               INTEGER             NOT NULL CHECK (contracts > 0),     -- 1 contract = 100 shares
    premium_per_contract    DECIMAL(10, 4)      NOT NULL CHECK (premium_per_contract > 0),
    total_premium           DECIMAL(12, 2)      GENERATED ALWAYS AS (contracts * premium_per_contract * 100) STORED,
    status                  option_status_enum  NOT NULL DEFAULT 'ACTIVE',
    notes                   TEXT,
    executed_at             TIMESTAMP           NOT NULL DEFAULT NOW(),
    created_at              TIMESTAMP           NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_options_underlying       ON options_transactions (UPPER(underlying_symbol));
CREATE INDEX idx_options_status           ON options_transactions (status);
CREATE INDEX idx_options_expiration       ON options_transactions (expiration_date);


-- =============================================================================
-- TABLE: portfolio_snapshots
-- Daily record of total portfolio value.
-- Powers all historical portfolio charts.
-- Filled by the scheduled job (midnight) and catch-up job (on startup).
-- =============================================================================

CREATE TABLE portfolio_snapshots (
    id              UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    date            DATE                    NOT NULL,
    total_value     DECIMAL(18, 2)          NOT NULL,
    daily_pnl       DECIMAL(18, 2)          NOT NULL DEFAULT 0,
    daily_pnl_pct   DECIMAL(8, 4),          -- percentage change vs previous day
    snapshot_source snapshot_source_enum    NOT NULL,
    created_at      TIMESTAMP               NOT NULL DEFAULT NOW()
);

-- One snapshot per day maximum
CREATE UNIQUE INDEX idx_portfolio_snapshots_date ON portfolio_snapshots (date);

CREATE INDEX idx_portfolio_snapshots_date_desc ON portfolio_snapshots (date DESC);


-- =============================================================================
-- TABLE: alerts
-- Price-based alerts on any symbol.
-- Checked every 5 minutes by the Spring scheduled job.
-- =============================================================================

CREATE TABLE alerts (
    id              UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol          VARCHAR(20)             NOT NULL,
    condition       alert_condition_enum    NOT NULL,
    threshold_price DECIMAL(18, 8)          NOT NULL CHECK (threshold_price > 0),
    note            TEXT,                   -- optional user label e.g. "Buy the dip"
    is_active       BOOLEAN                 NOT NULL DEFAULT TRUE,
    triggered_at    TIMESTAMP,              -- null until triggered
    created_at      TIMESTAMP               NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP               NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_alerts_updated
    BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_alerts_active        ON alerts (is_active) WHERE is_active = TRUE;
CREATE INDEX idx_alerts_symbol        ON alerts (UPPER(symbol));


-- =============================================================================
-- TABLE: watchlist
-- Symbols the user wants to track and analyze on demand.
-- AI analysis results are cached here per session.
-- =============================================================================

CREATE TABLE watchlist (
    id                  UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol              VARCHAR(20)             NOT NULL,
    company_name        VARCHAR(200),           -- populated from market API
    asset_type          asset_type_enum         NOT NULL DEFAULT 'STOCK',
    signal              watchlist_signal_enum   NOT NULL DEFAULT 'PENDING',
    signal_summary      TEXT,                   -- one-liner from AI analysis
    full_analysis       JSONB,                  -- complete AI analysis result (cached)
    last_analyzed_at    TIMESTAMP,              -- null until first analysis run
    added_at            TIMESTAMP               NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP               NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_watchlist_updated
    BEFORE UPDATE ON watchlist
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE UNIQUE INDEX idx_watchlist_symbol ON watchlist (UPPER(symbol));


-- =============================================================================
-- TABLE: monthly_investment_sessions
-- Records each time the user completes the Monthly Investment Flow.
-- Useful for history and analytics.
-- =============================================================================

CREATE TABLE monthly_investment_sessions (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    session_date        DATE            NOT NULL DEFAULT CURRENT_DATE,
    total_amount        DECIMAL(15, 2)  NOT NULL CHECK (total_amount > 0),
    currency            VARCHAR(10)     NOT NULL,
    allocations         JSONB           NOT NULL,   -- snapshot of what was allocated where
    -- e.g. [{"symbol": "VOO", "amount": 2000, "shares_bought": 3.2}, ...]
    notes               TEXT,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_monthly_sessions_date ON monthly_investment_sessions (session_date DESC);


-- =============================================================================
-- TABLE: ai_recommendation_cache
-- Caches the full recommendation engine output.
-- Invalidated after 15 minutes or on manual refresh.
-- =============================================================================

CREATE TABLE ai_recommendation_cache (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendations JSONB       NOT NULL,   -- full array of recommendation cards
    generated_at    TIMESTAMP   NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMP   NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes')
);

-- Only keep the latest cache entry
CREATE UNIQUE INDEX idx_ai_cache_single ON ai_recommendation_cache ((TRUE));


-- =============================================================================
-- TABLE: risk_profile_history
-- Tracks changes to the AI-inferred risk score over time.
-- Shown to user in their profile settings page.
-- =============================================================================

CREATE TABLE risk_profile_history (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    previous_risk_level     risk_level_enum,
    new_risk_level          risk_level_enum NOT NULL,
    previous_score          DECIMAL(4, 3),
    new_score               DECIMAL(4, 3)   NOT NULL,
    trigger_reason          TEXT            NOT NULL,   -- e.g. "10 new transactions analyzed"
    behavior_summary        TEXT,                       -- AI's explanation of what changed
    gap_from_stated         VARCHAR(50),                -- e.g. "SLIGHTLY_MORE_AGGRESSIVE"
    created_at              TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_risk_history_date ON risk_profile_history (created_at DESC);


-- =============================================================================
-- VIEWS
-- Useful derived views to simplify backend queries
-- =============================================================================

-- Current holdings derived from transactions
-- Computes net position per symbol from the full transaction history
CREATE VIEW current_holdings AS
SELECT
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
GROUP BY symbol, track
HAVING SUM(
    CASE
        WHEN type IN ('BUY')    THEN quantity
        WHEN type IN ('SELL')   THEN -quantity
        WHEN type IN ('SHORT')  THEN -quantity
        WHEN type IN ('COVER')  THEN quantity
        ELSE 0
    END
) > 0;  -- only show positions with positive net quantity


-- Active options positions
CREATE VIEW active_options AS
SELECT
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


-- Active alerts
CREATE VIEW active_alerts AS
SELECT
    id,
    symbol,
    condition,
    threshold_price,
    note,
    created_at
FROM alerts
WHERE is_active = TRUE
ORDER BY created_at DESC;


-- =============================================================================
-- SEED DATA
-- None — all data comes from the user via onboarding.
-- The app starts completely empty and is populated by the user.
-- =============================================================================


-- =============================================================================
-- SCHEMA VERSION TRACKING
-- =============================================================================

CREATE TABLE schema_migrations (
    version     VARCHAR(50)     PRIMARY KEY,
    applied_at  TIMESTAMP       NOT NULL DEFAULT NOW(),
    description TEXT
);

INSERT INTO schema_migrations (version, description)
VALUES ('1.0.0', 'Initial schema — all tables, enums, indexes, views');
