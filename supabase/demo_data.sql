-- Kullanıcının (admin olmadığı, son eklenen tenant sahibi) bilgilerini bul ve demo veri ekle

WITH target_tenant AS (
    SELECT t.id 
    FROM tenants t
    ORDER BY created_at DESC 
    LIMIT 1
)
INSERT INTO conversations (tenant_id, channel, external_thread_id, customer_handle, mode)
SELECT id, 'whatsapp', '905551234567', 'Ahmet Yılmaz (Demo)', 'HUMAN'
FROM target_tenant;

WITH target_conv AS (
    SELECT id, tenant_id
    FROM conversations
    ORDER BY created_at DESC
    LIMIT 1
)
INSERT INTO messages (tenant_id, conversation_id, direction, sender, text)
SELECT tenant_id, id, 'IN', 'CUSTOMER', 'Merhaba, paketleriniz hakkında bilgi alabilir miyim?'
FROM target_conv;

-- Kanal bağlantısı ekle (Settings sayfası dolu görünsün diye)
WITH target_tenant AS (
    SELECT id 
    FROM tenants 
    ORDER BY created_at DESC 
    LIMIT 1
)
INSERT INTO channel_connections (tenant_id, channel, status, meta_identifiers)
SELECT id, 'whatsapp', 'connected', '{"mock_id": "DEMO_123"}'::jsonb
FROM target_tenant
ON CONFLICT DO NOTHING;
