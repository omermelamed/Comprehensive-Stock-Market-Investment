-- V6: WhatsApp bot conversation log, pending confirmation tables, and whatsapp_enabled flag

-- Add whatsapp_enabled flag to user_profile (default false for existing users)
ALTER TABLE user_profile
    ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN NOT NULL DEFAULT FALSE;


CREATE TABLE whatsapp_conversations (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id   UUID        NOT NULL,
    phone_number VARCHAR(30) NOT NULL,
    direction    VARCHAR(10) NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
    message_body TEXT        NOT NULL,
    intent       VARCHAR(50),
    intent_data  JSONB,
    twilio_sid   VARCHAR(100),
    created_at   TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wa_conv_session ON whatsapp_conversations (session_id, created_at DESC);
CREATE INDEX idx_wa_conv_phone ON whatsapp_conversations (phone_number, created_at DESC);

CREATE TABLE whatsapp_pending_confirmations (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id           UUID        NOT NULL,
    intent               VARCHAR(50) NOT NULL,
    intent_data          JSONB       NOT NULL,
    confirmation_message TEXT        NOT NULL,
    state                VARCHAR(30) NOT NULL DEFAULT 'AWAITING_CONFIRMATION',
    expires_at           TIMESTAMP   NOT NULL,
    resolved             BOOLEAN     NOT NULL DEFAULT FALSE,
    resolution           VARCHAR(20),
    created_at           TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wa_pending_session
    ON whatsapp_pending_confirmations (session_id)
    WHERE resolved = FALSE;
