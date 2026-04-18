-- =============================================================================
-- V13: Sell Holdings — recalculation_jobs table + RETROACTIVE_RECALC source
-- =============================================================================

-- Add RETROACTIVE_RECALC to the existing snapshot_source_enum
ALTER TYPE snapshot_source_enum ADD VALUE IF NOT EXISTS 'RETROACTIVE_RECALC';

-- Recalculation status enum
CREATE TYPE recalc_status_enum AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'COMPLETED',
    'FAILED'
);

-- Tracks async recalculation jobs triggered by retroactive sells
CREATE TABLE recalculation_jobs (
    id                  UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    triggered_by        UUID                NOT NULL,
    sell_date           DATE                NOT NULL,
    recalc_from         DATE                NOT NULL,
    recalc_to           DATE                NOT NULL,
    total_days          INTEGER             NOT NULL,
    days_completed      INTEGER             NOT NULL DEFAULT 0,
    status              recalc_status_enum  NOT NULL DEFAULT 'PENDING',
    error_message       TEXT,
    started_at          TIMESTAMP,
    completed_at        TIMESTAMP,
    created_at          TIMESTAMP           NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recalc_jobs_status ON recalculation_jobs (status);
CREATE INDEX idx_recalc_jobs_created ON recalculation_jobs (created_at DESC);
