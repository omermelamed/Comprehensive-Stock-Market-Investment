-- V7: Add timezone to user_profile and create scheduled WhatsApp message tables

-- Add timezone to user_profile (default UTC)
ALTER TABLE user_profile
    ADD COLUMN IF NOT EXISTS timezone VARCHAR(60) NOT NULL DEFAULT 'UTC';

-- Scheduled message type enum
CREATE TYPE wa_message_type_enum AS ENUM (
    'PORTFOLIO_SUMMARY', 'PERFORMANCE_REPORT', 'ALLOCATION_CHECK',
    'INVESTMENT_REMINDER', 'TOP_MOVERS'
);

-- Frequency enum
CREATE TYPE wa_frequency_enum AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- Main schedules table
CREATE TABLE whatsapp_scheduled_messages (
    id              UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    message_type    wa_message_type_enum    NOT NULL,
    label           VARCHAR(100)            NOT NULL,
    frequency       wa_frequency_enum       NOT NULL,
    day_of_week     INTEGER                 CHECK (day_of_week BETWEEN 0 AND 6),   -- 0=Sun
    biweekly_week   INTEGER                 CHECK (biweekly_week IN (1, 2)),
    day_of_month    INTEGER                 CHECK (day_of_month BETWEEN 1 AND 28),
    send_time       TIME                    NOT NULL,
    is_active       BOOLEAN                 NOT NULL DEFAULT TRUE,
    last_sent_at    TIMESTAMP,
    next_send_at    TIMESTAMP               NOT NULL,
    send_count      INTEGER                 NOT NULL DEFAULT 0,
    created_at      TIMESTAMP               NOT NULL DEFAULT NOW()
);

-- Send log
CREATE TABLE whatsapp_scheduled_message_log (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id     UUID    NOT NULL REFERENCES whatsapp_scheduled_messages(id) ON DELETE CASCADE,
    sent_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    status          VARCHAR(10) NOT NULL CHECK (status IN ('SENT', 'FAILED')),
    error_message   TEXT,
    twilio_sid      VARCHAR(100)
);

CREATE INDEX idx_wa_sched_log_schedule ON whatsapp_scheduled_message_log (schedule_id, sent_at DESC);

-- View: schedules due to fire now
CREATE VIEW upcoming_scheduled_messages AS
    SELECT * FROM whatsapp_scheduled_messages
    WHERE is_active = TRUE AND next_send_at <= NOW();
