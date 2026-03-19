-- Mevcut conversation'ları müşteri kartlarıyla eşleştir (Tek seferlik)
-- Bu sorgu customer_id'si olmayan TÜM conversation'ları tarar ve eşleşme bulursa bağlar.

-- 1. WhatsApp: Telefon numarasına göre eşleştir
UPDATE conversations c
SET customer_id = matched.customer_id
FROM (
    SELECT 
        conv.id as conversation_id,
        cust.id as customer_id
    FROM conversations conv
    JOIN customers cust ON cust.tenant_id = conv.tenant_id::text
    WHERE conv.customer_id IS NULL
      AND conv.channel = 'whatsapp'
      AND cust.phone IS NOT NULL
      AND cust.phone != ''
      -- Normalize both sides: strip non-digits
      AND regexp_replace(cust.phone, '[^0-9]', '', 'g') = regexp_replace(conv.external_thread_id, '[^0-9]', '', 'g')
) matched
WHERE c.id = matched.conversation_id;

-- 2. Instagram: Kullanıcı adına göre eşleştir
UPDATE conversations c
SET customer_id = matched.customer_id
FROM (
    SELECT 
        conv.id as conversation_id,
        cust.id as customer_id
    FROM conversations conv
    JOIN customers cust ON cust.tenant_id = conv.tenant_id::text
    WHERE conv.customer_id IS NULL
      AND conv.channel = 'instagram'
      AND cust.instagram_username IS NOT NULL
      AND cust.instagram_username != ''
      AND lower(cust.instagram_username) = lower(conv.customer_handle)
) matched
WHERE c.id = matched.conversation_id;

-- Sonuçları kontrol et
SELECT id, channel, customer_handle, customer_id 
FROM conversations 
WHERE customer_id IS NOT NULL
ORDER BY updated_at DESC
LIMIT 20;
