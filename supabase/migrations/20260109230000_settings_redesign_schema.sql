-- 20260109230000_settings_redesign_schema.sql

-- 1. billing_info table
-- Stores tax/invoice details for a tenant.
-- "type" can be 'company' or 'individual'
CREATE TYPE billing_type AS ENUM ('company', 'individual');

CREATE TABLE billing_info (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    contact_email TEXT,
    contact_phone TEXT,
    billing_type billing_type DEFAULT 'company',
    -- Common fields
    full_name TEXT, -- For individual or auth person in company
    address_city TEXT,
    address_district TEXT,
    address_full TEXT,
    -- Company specific
    company_name TEXT,
    tax_office TEXT,
    tax_number TEXT,
    -- Individual specific
    tckn TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. payment_methods table
-- Stores stored credit cards (tokens).
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider TEXT DEFAULT 'iyzico', -- iyzico, stripe, etc.
    card_alias TEXT, -- e.g. "card_12345678" token from provider
    last_four TEXT,
    card_family TEXT, -- Visa, Master
    card_association TEXT, -- Bonus, Axess
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Update agent_settings
-- Add system_message for AI Agent
ALTER TABLE agent_settings ADD COLUMN IF NOT EXISTS system_message TEXT;

-- 4. RLS Policies
ALTER TABLE billing_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Allow tenant members to view/edit their own billing info
CREATE POLICY "Tenant members can view billing info" ON billing_info
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tenant_members
            WHERE tenant_members.tenant_id = billing_info.tenant_id
            AND tenant_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Tenant admins can update billing info" ON billing_info
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM tenant_members
            WHERE tenant_members.tenant_id = billing_info.tenant_id
            AND tenant_members.user_id = auth.uid()
            AND tenant_members.role IN ('agency_admin', 'tenant_owner')
        )
    );

CREATE POLICY "Tenant admins can insert billing info" ON billing_info
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM tenant_members
            WHERE tenant_members.tenant_id = billing_info.tenant_id
            AND tenant_members.user_id = auth.uid()
            AND tenant_members.role IN ('agency_admin', 'tenant_owner')
        )
    );

-- Allow tenant members to view payment methods
CREATE POLICY "Tenant members can view payment methods" ON payment_methods
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tenant_members
            WHERE tenant_members.tenant_id = payment_methods.tenant_id
            AND tenant_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Tenant admins can manage payment methods" ON payment_methods
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM tenant_members
            WHERE tenant_members.tenant_id = payment_methods.tenant_id
            AND tenant_members.user_id = auth.uid()
            AND tenant_members.role IN ('agency_admin', 'tenant_owner')
        )
    );
