-- =============================================================================
-- V3: Sub-allocations (parent/child hierarchy) and symbol aliases
-- =============================================================================

-- Symbol alias table: maps friendly names to real Yahoo Finance symbols
CREATE TABLE symbol_aliases (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    alias        VARCHAR(20) NOT NULL,
    yahoo_symbol VARCHAR(30) NOT NULL,
    created_at   TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_symbol_aliases_alias ON symbol_aliases (UPPER(alias));

-- Add parent_id to target_allocations for category/child hierarchy
ALTER TABLE target_allocations
    ADD COLUMN parent_id UUID REFERENCES target_allocations(id) ON DELETE CASCADE;
