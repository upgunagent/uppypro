-- 20260221_add_profile_pics_storage.sql
-- Instagram profil fotoğraflarını kalıcı olarak Supabase Storage'a kaydetmek için bucket oluşturma

-- 1. Profile pics bucket oluştur (public erişim)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pics', 'profile-pics', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Herkes okuyabilsin (public read)
CREATE POLICY "public_read_profile_pics" ON storage.objects
FOR SELECT USING (bucket_id = 'profile-pics');

-- 3. Service role ile yazma izni (webhook'tan yükleme için)
CREATE POLICY "service_upload_profile_pics" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'profile-pics');

-- 4. Service role ile güncelleme izni (upsert için)
CREATE POLICY "service_update_profile_pics" ON storage.objects
FOR UPDATE USING (bucket_id = 'profile-pics');
