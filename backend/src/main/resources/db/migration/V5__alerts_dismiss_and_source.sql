-- V5: Add dismissed_at and source to alerts
-- dismissed_at: set when user dismisses a triggered alert (clears the badge)
-- source: tracks where the alert was created from (APP, CHATBOT, WHATSAPP)

ALTER TABLE alerts
    ADD COLUMN dismissed_at TIMESTAMP,
    ADD COLUMN source        VARCHAR(20) NOT NULL DEFAULT 'APP';

CREATE INDEX idx_alerts_unread
    ON alerts (dismissed_at)
    WHERE is_active = FALSE AND triggered_at IS NOT NULL AND dismissed_at IS NULL;
