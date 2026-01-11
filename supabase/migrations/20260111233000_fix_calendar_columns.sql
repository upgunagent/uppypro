-- Add missing columns to calendar_events
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS guest_email text,
ADD COLUMN IF NOT EXISTS guest_phone text,
ADD COLUMN IF NOT EXISTS color text DEFAULT 'blue';
