-- BU KODU SUPABASE SQL EDITOR'DE ÇALIŞTIRIN
DO $$
DECLARE
    v_email TEXT := 'ugunagent@gmail.com';
    v_user_id UUID;
    v_tenant_id UUID;
BEGIN
    -- 1. Kullanıcıyı Bulmaya Çalış
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

    -- Debug: Bulunan ID'yi yazdır
    RAISE NOTICE 'Aranan Email: %, Bulunan User ID: %', v_email, v_user_id;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'KULLANICI BULUNAMADI! Lütfen email adresinin doğruluğunu kontrol edin (boşluk vs. var mı?).';
    END IF;

    -- 2. Tenant Bul
    SELECT id INTO v_tenant_id FROM public.tenants LIMIT 1;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'HİÇBİR İŞLETME (TENANT) BULUNAMADI!';
    END IF;

    RAISE NOTICE 'Hedef Tenant ID: %', v_tenant_id;

    -- 3. Yetkiyi Tanımla
    INSERT INTO public.tenant_members (tenant_id, user_id, role)
    VALUES (v_tenant_id, v_user_id, 'agency_admin')
    ON CONFLICT (tenant_id, user_id) 
    DO UPDATE SET role = 'agency_admin';

    RAISE NOTICE 'BAŞARILI: % kullanıcısına agency_admin yetkisi verildi.', v_email;
END $$;
