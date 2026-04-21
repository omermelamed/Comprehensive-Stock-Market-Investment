-- V17: Add fees column to transactions (default 0 for existing rows)
ALTER TABLE transactions ADD COLUMN fees DECIMAL(18, 2) NOT NULL DEFAULT 0;
