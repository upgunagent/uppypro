
-- 1. Ensure RLS is enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 2. Allow SELECT for authenticated users who belong to the tenant
-- This is crucial for Supabase Realtime to send events to the client.
DROP POLICY IF EXISTS "Tenant members can view messages" ON "messages";

CREATE POLICY "Tenant members can view messages"
ON "messages"
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id 
    FROM tenant_members 
    WHERE user_id = auth.uid()
  )
);

-- 3. Also allow INSERT for them (for sending messages)
DROP POLICY IF EXISTS "Tenant members can insert messages" ON "messages";

CREATE POLICY "Tenant members can insert messages"
ON "messages"
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id 
    FROM tenant_members 
    WHERE user_id = auth.uid()
  )
);
