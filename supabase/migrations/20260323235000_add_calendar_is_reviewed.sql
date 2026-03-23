-- Add is_reviewed column for tracking new AI-created appointments
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS is_reviewed BOOLEAN DEFAULT true;
-- Default true so manually created events don't show as "new"
-- AI-created events will explicitly set is_reviewed = false

-- Add created_by_ai column to distinguish AI vs manual events
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS created_by_ai BOOLEAN DEFAULT false;
