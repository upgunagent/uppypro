
BEGIN;

-- 1. Ensure Publication Exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END
$$;

-- 2. Add 'messages' to publication (Safely)
-- We remove it first to be sure, then add it, or just ignore error if exists.
-- The error 42710 means it's already there. 
-- Let's try to set REPLICA IDENTITY first as it is independent.

ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE conversations REPLICA IDENTITY FULL;

-- 3. Add to publication with error handling
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION
    WHEN duplicate_object THEN null; -- already exists
    WHEN OTHERS THEN null;
END
$$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
EXCEPTION
    WHEN duplicate_object THEN null; -- already exists
    WHEN OTHERS THEN null;
END
$$;

COMMIT;

-- 4. Verify (Select Logic)
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
