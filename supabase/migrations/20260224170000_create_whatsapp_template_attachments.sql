-- Şablonlara ait medya bağlantılarını tutacak tablo
CREATE TABLE IF NOT EXISTS public.whatsapp_template_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    template_name TEXT NOT NULL,
    language TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tenant_id, template_name, language)
);

ALTER TABLE public.whatsapp_template_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's template attachments"
    ON public.whatsapp_template_attachments FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their tenant's template attachments"
    ON public.whatsapp_template_attachments FOR INSERT
    WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their tenant's template attachments"
    ON public.whatsapp_template_attachments FOR UPDATE
    USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their tenant's template attachments"
    ON public.whatsapp_template_attachments FOR DELETE
    USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

-- Storage bucket oluştur (Eğer yoksa)
INSERT INTO storage.buckets (id, name, public) VALUES ('whatsapp_templates', 'whatsapp_templates', true)
ON CONFLICT (id) DO NOTHING;

-- Storage kuralları
CREATE POLICY "Public Access"
    ON storage.objects FOR SELECT
    USING ( bucket_id = 'whatsapp_templates' );

CREATE POLICY "Auth Users can upload"
    ON storage.objects FOR INSERT
    WITH CHECK ( bucket_id = 'whatsapp_templates' AND auth.role() = 'authenticated' );

CREATE POLICY "Auth Users can update"
    ON storage.objects FOR UPDATE
    USING ( bucket_id = 'whatsapp_templates' AND auth.role() = 'authenticated' );

CREATE POLICY "Auth Users can delete"
    ON storage.objects FOR DELETE
    USING ( bucket_id = 'whatsapp_templates' AND auth.role() = 'authenticated' );
