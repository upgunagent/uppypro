-- Fix RLS for channel_connections
-- Allow members of a tenant to insert/update connections for their tenant

DROP POLICY IF EXISTS "Enable all for tenant members" ON "public"."channel_connections";

CREATE POLICY "Enable all for tenant members"
ON "public"."channel_connections"
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
    exists (
      select 1
      from tenant_members
      where tenant_members.tenant_id = channel_connections.tenant_id
      and tenant_members.user_id = auth.uid()
    )
)
WITH CHECK (
    exists (
      select 1
      from tenant_members
      where tenant_members.tenant_id = channel_connections.tenant_id
      and tenant_members.user_id = auth.uid()
    )
);
