-- Create enterprise_invite_tokens table for custom magic link replacement
CREATE TABLE IF NOT EXISTS public.enterprise_invite_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token UUID NOT NULL UNIQUE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster token lookups
CREATE INDEX idx_enterprise_invite_tokens_token ON public.enterprise_invite_tokens(token);
CREATE INDEX idx_enterprise_invite_tokens_tenant_id ON public.enterprise_invite_tokens(tenant_id);

-- Enable RLS
ALTER TABLE public.enterprise_invite_tokens ENABLE ROW LEVEL SECURITY;

-- Allow public access to validate tokens (read-only for validation)
CREATE POLICY "Anyone can read enterprise invite tokens for validation"
    ON public.enterprise_invite_tokens
    FOR SELECT
    USING (true);

-- Only service role can manage tokens
CREATE POLICY "Service role can manage enterprise invite tokens"
    ON public.enterprise_invite_tokens
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
