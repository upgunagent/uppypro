
-- Enable Realtime for messages table
begin;
  -- Remove if exists to avoid error, or just try adding
  -- better to just try adding, checking if already exists is complex in simple script
  -- simpler approach:
  alter publication supabase_realtime add table messages;
commit;
