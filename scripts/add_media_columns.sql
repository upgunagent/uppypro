
-- Add message_type enum and column
BEGIN;

-- Check if type exists (safe-guard)
DO $$ BEGIN
    CREATE TYPE message_type_enum AS ENUM ('text', 'image', 'video', 'audio', 'document', 'location', 'sticker');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add columns if they don't exist
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS message_type message_type_enum DEFAULT 'text',
ADD COLUMN IF NOT EXISTS media_url text,
ADD COLUMN IF NOT EXISTS media_type text; -- Mime type (image/jpeg etc)

COMMIT;
