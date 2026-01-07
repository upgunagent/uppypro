-- 1. DEĞİŞKENLERİ TANIMLAYALIM
DO $$
DECLARE
    target_email TEXT := 'ugunagent@gmail.com';
    target_user_id UUID;
    target_tenant_id UUID;
BEGIN
    -- 2. KULLANICI ID'SİNİ BULALIM
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Kullanıcı bulunamadı: %', target_email;
    END IF;

    -- 3. HERHANGİ BİR TENANT BULALIM (Veya spesifik bir ID verebilirsiniz)
    -- Admin yetkisi genellikle "Hoppala Production" veya ana tenant üzerine verilir.
    -- Burada ilk bulduğumuz tenant'ı alıyoruz.
    SELECT id INTO target_tenant_id FROM public.tenants LIMIT 1;

    IF target_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Hiçbir tenant (işletme) bulunamadı. Önce bir işletme oluşturmalısınız.';
    END IF;

    -- 4. YETKİYİ VERELİM (Varsa güncelle, yoksa ekle)
    INSERT INTO public.tenant_members (tenant_id, user_id, role)
    VALUES (target_tenant_id, target_user_id, 'agency_admin')
    ON CONFLICT (tenant_id, user_id) 
    DO UPDATE SET role = 'agency_admin';

    RAISE NOTICE 'İşlem Başarılı! % kullanıcısı % işletmesine agency_admin olarak atandı.', target_email, target_tenant_id;
END $$;
