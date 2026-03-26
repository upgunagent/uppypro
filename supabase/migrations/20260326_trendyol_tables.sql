-- ================================================
-- Trendyol Entegrasyon Tabloları
-- UppyPro Kurumsal paket için e-ticaret entegrasyonu
-- ================================================

-- 1. Trendyol ürün kataloğu
CREATE TABLE IF NOT EXISTS trendyol_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  trendyol_product_id TEXT NOT NULL,
  product_code TEXT NOT NULL,
  barcode TEXT DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  brand TEXT DEFAULT '',
  category_name TEXT DEFAULT '',
  sale_price DECIMAL(10,2) DEFAULT 0,
  list_price DECIMAL(10,2) DEFAULT 0,
  quantity INTEGER DEFAULT 0,
  images JSONB DEFAULT '[]'::jsonb,
  attributes JSONB DEFAULT '{}'::jsonb,
  product_url TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  stock_alert_5_sent BOOLEAN DEFAULT false,
  stock_alert_1_sent BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, trendyol_product_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trendyol_products_business
ON trendyol_products(business_id);

CREATE INDEX IF NOT EXISTS idx_trendyol_products_stock
ON trendyol_products(business_id, quantity)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_trendyol_products_search
ON trendyol_products USING gin(
  to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(brand, ''))
);

-- 2. Trendyol sipariş cache
CREATE TABLE IF NOT EXISTS trendyol_orders_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  package_data JSONB,
  status TEXT DEFAULT '',
  cargo_provider TEXT DEFAULT '',
  tracking_number TEXT DEFAULT '',
  customer_name TEXT DEFAULT '',
  customer_phone TEXT DEFAULT '',
  estimated_delivery TIMESTAMPTZ,
  cached_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, order_number)
);

-- 3. Trendyol müşteri soruları
CREATE TABLE IF NOT EXISTS trendyol_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  trendyol_question_id TEXT NOT NULL,
  product_title TEXT DEFAULT '',
  question_text TEXT DEFAULT '',
  answer_text TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  answered_by TEXT DEFAULT 'ai',
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, trendyol_question_id)
);

-- 4. RLS Politikaları
ALTER TABLE trendyol_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE trendyol_orders_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE trendyol_questions ENABLE ROW LEVEL SECURITY;

-- Service role (admin) her şeye erişebilir
CREATE POLICY "service_role_trendyol_products"
ON trendyol_products FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "service_role_trendyol_orders_cache"
ON trendyol_orders_cache FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "service_role_trendyol_questions"
ON trendyol_questions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated kullanıcılar sadece kendi tenant verilerini görebilir
CREATE POLICY "tenant_trendyol_products_select"
ON trendyol_products FOR SELECT
TO authenticated
USING (
  business_id IN (
    SELECT tenant_id FROM tenant_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "tenant_trendyol_orders_select"
ON trendyol_orders_cache FOR SELECT
TO authenticated
USING (
  business_id IN (
    SELECT tenant_id FROM tenant_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "tenant_trendyol_questions_select"
ON trendyol_questions FOR SELECT
TO authenticated
USING (
  business_id IN (
    SELECT tenant_id FROM tenant_members
    WHERE user_id = auth.uid()
  )
);
