-- Add optional WhatsApp notification number to user profile
ALTER TABLE user_profile
    ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
