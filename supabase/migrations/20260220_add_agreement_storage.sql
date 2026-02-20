-- 20260220_add_agreement_storage.sql
-- Bu script, mesafeli satış sözleşmelerini saklamak için gerekli alanı ve sütunu oluşturur.

-- 1. subscriptions tablosuna yeni sütun ekleme
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS agreement_pdf_url TEXT;

-- 2. Supabase Storage: agreements bucket'ını oluştur (Eğer manuel oluşturmadıysanız)
INSERT INTO storage.buckets (id, name, public)
VALUES ('agreements', 'agreements', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policy: sadece yetkili servis/admin yükleme yapabilir (güvenlik için)
-- Not: Biz server tarafında (service_role key ile) yükleyeceğimiz için 
-- aslen policy'ye gerek yok ama frontend denemelerine karşı kapalı tutuyoruz
CREATE POLICY "admin_upload_agreements" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'agreements'
        AND EXISTS (
            SELECT 1 FROM tenant_members tm
            WHERE tm.user_id = auth.uid()
            AND tm.role = 'agency_admin'
        )
    );

-- 4. Storage policy: herkes anlaşmasını(pdf) okuyabilir (public link üzerinden açılacağı için public bucket yapısı yeterli)
CREATE POLICY "public_read_agreements" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'agreements');
