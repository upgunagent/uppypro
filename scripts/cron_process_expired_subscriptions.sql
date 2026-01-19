
-- Abonelik Süresi Dolma İşlemi (Cron Job)
-- Bu fonksiyon, periyodik olarak çalıştırılarak (örn: her gece 03:00) süresi dolmuş ve 
-- iptali planlanmış (cancel_at_period_end=true) abonelikleri 'canceled' statüsüne çeker.

CREATE OR REPLACE FUNCTION process_expired_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    r RECORD;
    v_updated_count INT := 0;
BEGIN
    -- Döngü ile işlem yapalım (Audit log gerekirse burada daha detaylı işlem yapılabilir)
    FOR r IN 
        SELECT id, tenant_id 
        FROM subscriptions
        WHERE status = 'active'
          AND cancel_at_period_end = true
          AND current_period_end < now()
    LOOP
        -- 1. Aboneliği iptal et
        UPDATE subscriptions
        SET 
            status = 'canceled',
            canceled_at = now()
        WHERE id = r.id;

        -- 2. (Opsiyonel) Entitlement'ları kapat
        -- Örn: agent_settings tablosunda is_active = false yap
        UPDATE agent_settings
        SET is_active = false
        WHERE tenant_id = r.tenant_id;
        
        -- Örn: channel_connections'ı pasife çek
        UPDATE channel_connections
        SET is_active = false
        WHERE tenant_id = r.tenant_id;

        v_updated_count := v_updated_count + 1;
    END LOOP;

    RAISE NOTICE 'Expired subscriptions processed: %', v_updated_count;
END;
$$;

-- Cron Tanımı (Supabase pg_cron eklentisi gerektirir)
-- Eğer pg_cron aktif değilse, bu kısım hata verebilir. Kullanıcı manuel de tetikleyebilir.
-- SELECT cron.schedule(
--   'process-subscriptions-nightly', 
--   '0 3 * * *', -- Her gün 03:00
--   $$SELECT process_expired_subscriptions()$$
-- );
