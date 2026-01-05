-- Add connection_method to channel_connections
-- Values: 'instagram_login', 'legacy_page', etc.

ALTER TABLE public.channel_connections 
ADD COLUMN IF NOT EXISTS connection_method TEXT DEFAULT 'legacy_page';

COMMENT ON COLUMN public.channel_connections.connection_method IS 'auth method: instagram_login or legacy_page';
