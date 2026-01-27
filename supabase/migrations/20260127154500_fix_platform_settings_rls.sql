-- Fix RLS policy for platform_settings
-- The previous policy only allowed SELECT. We need to allow INSERT and UPDATE.

DROP POLICY IF EXISTS "Allow read access for authenticated users" ON platform_settings;

-- For now, we allow authenticated users to manage platform settings.
-- SECURITY NOTE: In a production environment, you should restrict this to super admins only.
-- This relies on the application layer (Middleware/Layout) to prevent unauthorized access to the admin page.
CREATE POLICY "Allow full access for authenticated users" ON platform_settings
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);
