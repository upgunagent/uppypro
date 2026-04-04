-- Web Chat Webhook Module
-- Her isletmeye ozel webhook URL olusturma ve webchat kanali icin destek

-- 0. channel_type enum'una 'webchat' degerini ekle
ALTER TYPE channel_type ADD VALUE IF NOT EXISTS 'webchat';

-- 1. tenants tablosuna webchat alanlari ekle
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS webchat_enabled BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS webchat_api_key TEXT;

-- 2. Mevcut tum tenants icin benzersiz API key uret
UPDATE tenants SET webchat_api_key = gen_random_uuid()::text WHERE webchat_api_key IS NULL;

-- 3. Yeni tenants icin default deger ayarla (trigger ile)
CREATE OR REPLACE FUNCTION set_webchat_api_key()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.webchat_api_key IS NULL THEN
    NEW.webchat_api_key := gen_random_uuid()::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_webchat_api_key ON tenants;
CREATE TRIGGER trg_set_webchat_api_key
BEFORE INSERT ON tenants
FOR EACH ROW EXECUTE FUNCTION set_webchat_api_key();
