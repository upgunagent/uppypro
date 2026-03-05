-- Create customer_lists table for saving named audience lists
CREATE TABLE IF NOT EXISTS public.customer_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    rows JSONB NOT NULL DEFAULT '[]',
    row_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for tenant lookups
CREATE INDEX IF NOT EXISTS customer_lists_tenant_id_idx ON public.customer_lists(tenant_id);

-- Enable RLS
ALTER TABLE public.customer_lists ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Allow Tenant Access on customer_lists" ON public.customer_lists
    FOR ALL
    USING (tenant_id IN (
        SELECT tenant_id::text FROM tenant_members WHERE user_id = auth.uid()
    ));

-- Grants
GRANT ALL ON public.customer_lists TO authenticated;
GRANT ALL ON public.customer_lists TO service_role;
