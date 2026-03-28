-- Create lead_folders table
CREATE TABLE IF NOT EXISTS public.lead_folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for lead_folders
ALTER TABLE public.lead_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_members_can_view_folders" ON public.lead_folders 
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    );

CREATE POLICY "agency_admins_manage_folders" ON public.lead_folders 
    FOR ALL USING (
        tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND role = 'agency_admin')
    );

-- Add folder_id to lead_lists
ALTER TABLE public.lead_lists ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.lead_folders(id) ON DELETE SET NULL;
