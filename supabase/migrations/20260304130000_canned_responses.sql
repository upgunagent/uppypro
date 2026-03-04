-- Supabase UI üzerinden çalıştırılacak Hazır Cevaplar ve AI Ayarları tablosu

-- 1. Hazır Cevaplar (Canned Responses) Tablosu
CREATE TABLE IF NOT EXISTS public.canned_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    shortcut TEXT NOT NULL, -- Örn: '/fiyat' veya 'fiyat'
    content TEXT NOT NULL, -- Gönderilecek uzun metin
    media_url TEXT, -- Varsa görselin Supabase Storage URL'i
    keywords TEXT[], -- AI öneri sistemi için anahtar kelimeler (örn: ['fiyat', 'ücret', 'maliyet'])
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster shortcut and tenant lookups
CREATE INDEX IF NOT EXISTS idx_canned_responses_tenant_shortcut ON public.canned_responses(tenant_id, shortcut);

-- RLS (Row Level Security)
ALTER TABLE public.canned_responses ENABLE ROW LEVEL SECURITY;

-- Politikalar: Kullanıcılar yalnızca kendi tenant'larına ait cevapları görebilir ve yönetebilir
CREATE POLICY "Kullanıcılar kendi firmalarının hazır cevaplarını görebilir"
ON public.canned_responses FOR SELECT
TO authenticated
USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
));

CREATE POLICY "Yetkili kullanıcılar kendi firmalarına hazır cevap ekleyebilir"
ON public.canned_responses FOR INSERT
TO authenticated
WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
));

CREATE POLICY "Yetkili kullanıcılar kendi firmalarındaki hazır cevapları güncelleyebilir"
ON public.canned_responses FOR UPDATE
TO authenticated
USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
));

CREATE POLICY "Yetkili kullanıcılar kendi firmalarındaki hazır cevapları silebilir"
ON public.canned_responses FOR DELETE
TO authenticated
USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
));


-- 2. Tenant Ayarları Güncellemesi (AI Düzeltme Ayarı için sütun ekleme)
-- Mevcut tenant_settings tablosuna (Eğer yoksa tenants tablosuna ekleyebiliriz ama genelde tenant_settings kullanılır)
-- 'ai_auto_correct_enabled' adında bir alan ekleyelim

ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS ai_auto_correct_enabled BOOLEAN DEFAULT true;


-- 3. Storage Bucket for Canned Response Media
-- "canned_media" adında yeni bir public bucket oluşturuyoruz
INSERT INTO storage.buckets (id, name, public) 
VALUES ('canned_media', 'canned_media', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for Storage (canned_media)
-- Kullanıcılar sadece sisteme giriş yapmışsa dosya yükleyebilir
CREATE POLICY "Authenticated users can upload canned media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'canned_media');

-- Herkes okuyabilir (görsellerin WhatsApp'a veya web'e gitmesi için public olması lazım)
CREATE POLICY "Public read access for canned media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'canned_media');

CREATE POLICY "Authenticated users can delete their own canned media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'canned_media');
