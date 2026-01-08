-- Create CUSTOMERS table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    tenant_id TEXT NOT NULL,
    
    full_name TEXT,
    company_name TEXT,
    phone TEXT,
    email TEXT,
    notes TEXT,
    profile_pic TEXT,
    
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add Index for frequent lookups
CREATE INDEX IF NOT EXISTS customers_tenant_id_idx ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS customers_phone_idx ON public.customers(phone);

-- Link Conversations to Customers
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Copying logic from conversations/messages to ensure Tenant isolation)
CREATE POLICY "Allow Tenant Access" ON public.customers
    FOR ALL
    USING (tenant_id IN (
        SELECT tenant_id::text FROM tenant_members WHERE user_id = auth.uid()
    ));

-- Grant permissions
GRANT ALL ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
