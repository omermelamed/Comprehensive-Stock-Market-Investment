-- V8: Add source column to transactions to distinguish manual entry from imports
-- Existing rows are retroactively tagged as MANUAL (safe default — all were entered by hand).

ALTER TABLE transactions
    ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'MANUAL';
