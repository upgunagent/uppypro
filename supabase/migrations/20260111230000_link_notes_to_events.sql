-- Add event_id to customer_notes
ALTER TABLE customer_notes 
ADD COLUMN event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE;

-- Index for performance
CREATE INDEX idx_customer_notes_event_id ON customer_notes(event_id);
