-- Built-in Gemini AI + SMTP Email Settings Migration
-- 1. agent_settings tablosuna yeni alanlar
ALTER TABLE agent_settings 
  ADD COLUMN IF NOT EXISTS ai_mode TEXT DEFAULT 'disabled' 
    CHECK (ai_mode IN ('built_in', 'webhook', 'disabled')),
  ADD COLUMN IF NOT EXISTS ai_model TEXT DEFAULT 'gemini-2.0-flash',
  ADD COLUMN IF NOT EXISTS updated_by TEXT;

-- Mevcut veriler için geçiş:
-- n8n_webhook_url olan firmalar webhook moduna geçsin
UPDATE agent_settings SET ai_mode = 'webhook' 
WHERE n8n_webhook_url IS NOT NULL AND n8n_webhook_url != '' AND ai_mode = 'disabled';

-- 2. email_settings tablosu (firma SMTP ayarları)
CREATE TABLE IF NOT EXISTS email_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT UNIQUE NOT NULL,
  smtp_host TEXT,
  smtp_port INTEGER DEFAULT 587,
  smtp_user TEXT,
  smtp_pass_encrypted TEXT,
  smtp_from_name TEXT,
  smtp_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policy
ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on email_settings" ON email_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. update_customer RPC fonksiyonu
CREATE OR REPLACE FUNCTION public.update_customer(
  p_tenant_id TEXT,
  p_customer_phone TEXT,
  p_field TEXT,
  p_value TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_allowed_fields TEXT[] := ARRAY['email', 'phone', 'full_name', 'company_name', 'instagram_username'];
BEGIN
  -- Güvenlik: sadece izin verilen alanlar güncellenebilir
  IF NOT (p_field = ANY(v_allowed_fields)) THEN
    RETURN json_build_object('success', false, 'message', 'Bu alan güncellenemez: ' || p_field);
  END IF;

  -- Müşteriyi telefon numarası ile bul
  SELECT id INTO v_customer_id
  FROM customers
  WHERE tenant_id = p_tenant_id
    AND (phone = p_customer_phone OR phone = '+' || p_customer_phone)
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Müşteri bulunamadı');
  END IF;

  -- Dinamik alan güncelleme
  EXECUTE format('UPDATE customers SET %I = $1, updated_at = now() WHERE id = $2', p_field)
  USING p_value, v_customer_id;

  RETURN json_build_object('success', true, 'message', p_field || ' başarıyla güncellendi');
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_customer(text, text, text, text) TO anon, authenticated, service_role;
