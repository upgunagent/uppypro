-- Add is_read column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- Backfill existing messages as read (optional, but good for clean slate)
UPDATE messages SET is_read = TRUE WHERE is_read IS FALSE;

-- Create index for faster counting
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read) WHERE is_read IS FALSE;
