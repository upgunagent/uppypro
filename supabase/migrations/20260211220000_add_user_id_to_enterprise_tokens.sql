-- Add user_id column to enterprise_invite_tokens table
-- This is needed to send password setup email after payment

ALTER TABLE public.enterprise_invite_tokens 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill existing records (if any)
-- Find the tenant owner for each existing token
UPDATE public.enterprise_invite_tokens eit
SET user_id = (
    SELECT user_id 
    FROM public.tenant_members tm 
    WHERE tm.tenant_id = eit.tenant_id 
    AND tm.role = 'tenant_owner' 
    LIMIT 1
)
WHERE user_id IS NULL;

-- Make column NOT NULL after backfill
ALTER TABLE public.enterprise_invite_tokens 
ALTER COLUMN user_id SET NOT NULL;
