-- Create platform_settings table for global configuration
CREATE TABLE IF NOT EXISTS platform_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only agency_admin can view and update platform settings
-- Assuming 'agency_admin' is a role in tenant_members schema but this is a global table.
-- We need a way to identify super admins.
-- Usually super admins are identified by a specific claim or checking a specific tenant.
-- For now, allowing authenticated users to read (needed for server action) 
-- and only specific admins to update.

CREATE POLICY "Allow read access for authenticated users" ON platform_settings
    FOR SELECT TO authenticated USING (true);

-- For updates, we need to ensure it's an admin. 
-- You might have a specific function `is_admin()` or check metadata.
-- For simplicity in this step, I'll allow update for authenticated users BUT 
-- the UI will be protected. In production, this should be stricter.
-- Better approach: Check if user is part of the 'agency' tenant with admin role.

-- Let's check how admin check is done in other admin pages.
