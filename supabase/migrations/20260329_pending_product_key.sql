-- Paket düşürme (downgrade) dönem sonu geçişi için
-- Kullanıcı downgrade istediğinde buraya yeni product key yazılır
-- current_period_end tarihinde cron/webhook bu key'e geçiş tetikler
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS pending_product_key TEXT DEFAULT NULL;

-- Bilgilendirme:
-- NULL = bekleyen değişiklik yok
-- 'uppypro_inbox' = dönem sonunda Inbox'a geçiş planlandı
-- 'uppypro_ai' = dönem sonunda AI'a geçiş planlandı
-- vb.
