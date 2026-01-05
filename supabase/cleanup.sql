-- TEMİZLİK KODU
-- otopkan@gmail.com kullanıcısını ve ona bağlı tüm işletmeleri siler.

DO $$
DECLARE
    target_user_id UUID;
    v_tenant_id UUID;
BEGIN
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'otopkan@gmail.com';

    IF target_user_id IS NOT NULL THEN
        -- 1. Bu kullanıcının üye olduğu tenant_id'leri bul ve geçici tabloya at (veya döngüyle sil)
        -- Ama "Sahibi" olduğu tenantları silmeliyiz. Diğer türlü sadece üyelikten çıkarız.
        -- Hepsini temizlemek istiyoruz.
        
        FOR v_tenant_id IN 
            SELECT tenant_id FROM tenant_members WHERE user_id = target_user_id
        LOOP
            -- Tenant'ı sil (Cascade sayesinde members, messages vb. silinir)
            DELETE FROM tenants WHERE id = v_tenant_id;
        END LOOP;

        -- 2. Kullanıcıyı sil (Profil cascade ile silinir)
        DELETE FROM auth.users WHERE id = target_user_id;
        
        RAISE NOTICE 'Kullanıcı ve ilişkili işletmeler temizlendi.';
    ELSE
        RAISE NOTICE 'Kullanıcı bulunamadı.';
    END IF;
END $$;
