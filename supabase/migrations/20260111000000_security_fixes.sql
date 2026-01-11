-- Fix Security Warnings: Mutable Search Path
-- Setting search_path to empty string prevents malicious objects in public schema 
-- from overriding system functions or expected tables.

-- 1. handle_new_user (Trigger function)
ALTER FUNCTION public.handle_new_user() SET search_path = '';

-- 2. is_tenant_member (Security Definer)
ALTER FUNCTION public.is_tenant_member(UUID) SET search_path = '';

-- 3. is_agency_admin (Security Definer)
ALTER FUNCTION public.is_agency_admin() SET search_path = '';

-- 4. update_conversation_timestamp (Likely Trigger function)
-- Using DO block to safely apply only if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_conversation_timestamp') THEN
         ALTER FUNCTION public.update_conversation_timestamp() SET search_path = '';
    END IF;
END
$$;
