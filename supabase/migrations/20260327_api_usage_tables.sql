-- ================================================
-- API Kullanım Takip Tabloları
-- Admin panel raporlama için
-- ================================================

-- 1. API Kullanım Logları
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  api_type TEXT NOT NULL,              -- 'gemini', 'trendyol', 'whatsapp', 'instagram'
  endpoint TEXT DEFAULT '',            -- Hangi endpoint/tool çağrıldı
  model TEXT DEFAULT '',               -- AI model adı
  input_tokens INTEGER DEFAULT 0,     -- Giriş token sayısı
  output_tokens INTEGER DEFAULT 0,    -- Çıkış token sayısı
  estimated_cost DECIMAL(10,6) DEFAULT 0, -- Tahmini maliyet ($)
  status TEXT DEFAULT 'success',       -- success, error
  metadata JSONB DEFAULT '{}',         -- Ek bilgiler
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexler
CREATE INDEX IF NOT EXISTS idx_api_usage_tenant_date ON api_usage_logs(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_api_type ON api_usage_logs(api_type, created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_created ON api_usage_logs(created_at);

-- 2. Günlük Özet Tablosu (performans için)
CREATE TABLE IF NOT EXISTS api_usage_daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  api_type TEXT NOT NULL,
  model TEXT DEFAULT '',
  total_requests INTEGER DEFAULT 0,
  total_input_tokens BIGINT DEFAULT 0,
  total_output_tokens BIGINT DEFAULT 0,
  total_cost DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, date, api_type, model)
);

CREATE INDEX IF NOT EXISTS idx_usage_summary_date ON api_usage_daily_summary(date);
CREATE INDEX IF NOT EXISTS idx_usage_summary_tenant ON api_usage_daily_summary(tenant_id, date);

-- 3. RLS Politikaları
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_daily_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_api_usage_logs"
ON api_usage_logs FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "service_role_api_usage_summary"
ON api_usage_daily_summary FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
