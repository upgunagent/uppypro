-- Fix: Fully qualify table names in Security Definer functions
-- This is required because we set search_path = '' for security, 
-- so unqualified table names (like 'tenant_members') fail to resolve.

-- 1. is_tenant_member
CREATE OR REPLACE FUNCTION public.is_tenant_member(tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE public.tenant_members.tenant_id = is_tenant_member.tenant_id
    AND public.tenant_members.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 2. is_agency_admin
CREATE OR REPLACE FUNCTION public.is_agency_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE public.tenant_members.user_id = auth.uid()
    AND public.tenant_members.role = 'agency_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 3. handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 4. update_conversation_timestamp (Conditional)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_conversation_timestamp') THEN
        EXECUTE '
            CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
            RETURNS TRIGGER AS $inner$
            BEGIN
                UPDATE public.conversations
                SET updated_at = NOW()
                WHERE id = NEW.conversation_id;
                RETURN NEW;
            END;
            $inner$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '''';
        ';
    END IF;
END
$$;
