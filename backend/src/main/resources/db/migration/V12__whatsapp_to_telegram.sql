-- V12: Migrate WhatsApp integration to Telegram

-- Rename profile columns
ALTER TABLE user_profile RENAME COLUMN whatsapp_number  TO telegram_chat_id;
ALTER TABLE user_profile RENAME COLUMN whatsapp_enabled TO telegram_enabled;

-- Rename conversation table and columns
ALTER TABLE whatsapp_conversations RENAME TO telegram_conversations;
ALTER TABLE telegram_conversations RENAME COLUMN twilio_sid TO telegram_message_id;

DROP INDEX IF EXISTS idx_wa_conv_session;
DROP INDEX IF EXISTS idx_wa_conv_phone;
CREATE INDEX idx_tg_conv_session ON telegram_conversations (session_id, created_at DESC);
CREATE INDEX idx_tg_conv_phone   ON telegram_conversations (phone_number, created_at DESC);

-- Rename pending confirmations table
ALTER TABLE whatsapp_pending_confirmations RENAME TO telegram_pending_confirmations;

DROP INDEX IF EXISTS idx_wa_pending_session;
CREATE INDEX idx_tg_pending_session
    ON telegram_pending_confirmations (session_id)
    WHERE resolved = FALSE;

-- Rename scheduled message tables
ALTER TABLE whatsapp_scheduled_messages RENAME TO telegram_scheduled_messages;
ALTER TABLE whatsapp_scheduled_message_log RENAME TO telegram_scheduled_message_log;

-- Rename column in log table
ALTER TABLE telegram_scheduled_message_log RENAME COLUMN twilio_sid TO telegram_message_id;

DROP INDEX IF EXISTS idx_wa_sched_log_schedule;
CREATE INDEX idx_tg_sched_log_schedule ON telegram_scheduled_message_log (schedule_id, sent_at DESC);

-- Rename enums
ALTER TYPE wa_message_type_enum RENAME TO tg_message_type_enum;
ALTER TYPE wa_frequency_enum    RENAME TO tg_frequency_enum;

-- Recreate the view against the renamed table
DROP VIEW IF EXISTS upcoming_scheduled_messages;
CREATE VIEW upcoming_scheduled_messages AS
    SELECT * FROM telegram_scheduled_messages
    WHERE is_active = TRUE AND next_send_at <= NOW();
