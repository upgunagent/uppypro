-- 20240108_add_delete_messages_policy.sql

-- Allow members to update their tenant's messages (e.g. for editing)
CREATE POLICY "Members can update messages" ON messages
    FOR UPDATE USING (is_tenant_member(tenant_id));

-- Allow members to delete their tenant's messages (e.g. for clearing chat)
CREATE POLICY "Members can delete messages" ON messages
    FOR DELETE USING (is_tenant_member(tenant_id));
