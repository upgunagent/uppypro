-- Create or replace the updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create whatsapp_templates table
CREATE TABLE whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    meta_template_id text,
    name text NOT NULL,
    category text NOT NULL DEFAULT 'MARKETING',
    language text NOT NULL DEFAULT 'tr',
    components JSONB NOT NULL DEFAULT '[]'::jsonb,
    status text NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_tenant_template_name UNIQUE(tenant_id, name)
);

-- Enable RLS for whatsapp_templates
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for whatsapp_templates
CREATE POLICY "Users can view their own tenant's templates"
    ON whatsapp_templates FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can create templates for their tenant"
    ON whatsapp_templates FOR INSERT
    WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
        AND role IN ('tenant_owner', 'agency_admin')
    ));

CREATE POLICY "Users can update their own tenant's templates"
    ON whatsapp_templates FOR UPDATE
    USING (tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
        AND role IN ('tenant_owner', 'agency_admin')
    ));

CREATE POLICY "Users can delete their own tenant's templates"
    ON whatsapp_templates FOR DELETE
    USING (tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
        AND role IN ('tenant_owner', 'agency_admin')
    ));


-- Create campaigns table
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES whatsapp_templates(id),
    name text NOT NULL,
    status text NOT NULL DEFAULT 'DRAFT', -- DRAFT, SCHEDULED, RUNNING, COMPLETED, FAILED
    total_target integer DEFAULT 0,
    successful_sent integer DEFAULT 0,
    delivered_count integer DEFAULT 0,
    read_count integer DEFAULT 0,
    failed_count integer DEFAULT 0,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for campaigns
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Create policies for campaigns
CREATE POLICY "Users can view their own tenant's campaigns"
    ON campaigns FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can create campaigns for their tenant"
    ON campaigns FOR INSERT
    WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
        AND role IN ('tenant_owner', 'agency_admin')
    ));

CREATE POLICY "Users can update their own tenant's campaigns"
    ON campaigns FOR UPDATE
    USING (tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
        AND role IN ('tenant_owner', 'agency_admin')
    ));

CREATE POLICY "Users can delete their own tenant's campaigns"
    ON campaigns FOR DELETE
    USING (tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
        AND role IN ('tenant_owner', 'agency_admin')
    ));


-- Create customer_campaign_logs table
CREATE TABLE customer_campaign_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    phone_number text NOT NULL,
    meta_message_id text,
    status text NOT NULL DEFAULT 'pending', -- pending, sent, delivered, read, failed
    error_message text,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_customer_campaign_logs_campaign_id ON customer_campaign_logs(campaign_id);
CREATE INDEX idx_customer_campaign_logs_tenant_id ON customer_campaign_logs(tenant_id);
CREATE INDEX idx_customer_campaign_logs_customer_id ON customer_campaign_logs(customer_id);
CREATE INDEX idx_customer_campaign_logs_phone_number ON customer_campaign_logs(phone_number);
CREATE INDEX idx_customer_campaign_logs_meta_message_id ON customer_campaign_logs(meta_message_id);

-- Enable RLS for customer_campaign_logs
ALTER TABLE customer_campaign_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for customer_campaign_logs
CREATE POLICY "Users can view their own tenant's campaign logs"
    ON customer_campaign_logs FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own tenant's campaign logs"
    ON customer_campaign_logs FOR INSERT
    WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
        AND role IN ('tenant_owner', 'agency_admin')
    ));

CREATE POLICY "Users can update their own tenant's campaign logs"
    ON customer_campaign_logs FOR UPDATE
    USING (tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    ));

-- Add triggers for updated_at
CREATE TRIGGER set_whatsapp_templates_updated_at
    BEFORE UPDATE ON whatsapp_templates
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_customer_campaign_logs_updated_at
    BEFORE UPDATE ON customer_campaign_logs
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();
