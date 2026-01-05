-- 20240101000003_rls_policies.sql

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is a member of the tenant
CREATE OR REPLACE FUNCTION is_tenant_member(tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tenant_members
    WHERE tenant_members.tenant_id = is_tenant_member.tenant_id
    AND tenant_members.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is agency admin
CREATE OR REPLACE FUNCTION is_agency_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tenant_members
    WHERE tenant_members.user_id = auth.uid()
    AND tenant_members.role = 'agency_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --- POLICIES ---

-- 1. profiles
-- User can view/edit their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Agency admins might need to see profiles? For now, keep it strict. 
-- Tenant members can see other members of same tenant? Maybe needed for UI, skipping for MVP strictness.

-- 2. tenants
-- Agency admin can view all tenants (TODO: refine logic if agency is also a tenant or separate concept)
-- For MVP: Tenant stats are private.
CREATE POLICY "Members can view their own tenant" ON tenants
    FOR SELECT USING (is_tenant_member(id));

-- 3. tenant_members
CREATE POLICY "Members can view members of their tenant" ON tenant_members
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_members tm WHERE tm.user_id = auth.uid()
        )
    );

-- 4. channel_connections
CREATE POLICY "Members can view channel connections" ON channel_connections
    FOR SELECT USING (is_tenant_member(tenant_id));
    
-- Only owners or admins should update connection tokens? For MVP allow members.
CREATE POLICY "Members can update channel connections" ON channel_connections
    FOR UPDATE USING (is_tenant_member(tenant_id));

-- 5. agent_settings
CREATE POLICY "Members can view agent settings" ON agent_settings
    FOR SELECT USING (is_tenant_member(tenant_id));
    
-- Only Admin/Owner should update? MVP: Allow members
CREATE POLICY "Members can update agent settings" ON agent_settings
    FOR UPDATE USING (is_tenant_member(tenant_id));

-- 6. conversations
CREATE POLICY "Members can view conversations" ON conversations
    FOR SELECT USING (is_tenant_member(tenant_id));

CREATE POLICY "Members can upsert conversations" ON conversations
    FOR ALL USING (is_tenant_member(tenant_id));

-- 7. messages
CREATE POLICY "Members can view messages" ON messages
    FOR SELECT USING (is_tenant_member(tenant_id));

CREATE POLICY "Members can insert messages" ON messages
    FOR INSERT WITH CHECK (is_tenant_member(tenant_id));

-- 8. subscriptions
CREATE POLICY "Members can view subscriptions" ON subscriptions
    FOR SELECT USING (is_tenant_member(tenant_id));

-- 9. payments
CREATE POLICY "Members can view payments" ON payments
    FOR SELECT USING (is_tenant_member(tenant_id));

-- Products and Pricing (Publicly readable or authenticated readable)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read products" ON products FOR SELECT USING (true);
CREATE POLICY "Everyone can read pricing" ON pricing FOR SELECT USING (true);

