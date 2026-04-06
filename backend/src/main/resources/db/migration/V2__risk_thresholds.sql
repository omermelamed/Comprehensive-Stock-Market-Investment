CREATE TABLE risk_thresholds (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    max_single_position_pct DECIMAL(5, 2) NOT NULL DEFAULT 25.00,
    max_sector_pct          DECIMAL(5, 2) NOT NULL DEFAULT 40.00,
    max_drawdown_pct        DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
    drift_warning_pct       DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
    rebalance_reminder_days INTEGER NOT NULL DEFAULT 30,
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_risk_thresholds_updated
    BEFORE UPDATE ON risk_thresholds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE UNIQUE INDEX idx_risk_thresholds_single_row ON risk_thresholds ((TRUE));

INSERT INTO risk_thresholds DEFAULT VALUES;
