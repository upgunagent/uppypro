-- =============================================
-- UppyPro TUR MODÜLÜ v2 — Enhancement Migration
-- Tarih: 2026-04-03
-- Ödeme bilgileri, IBAN yönetimi, rezervasyon durumları
-- =============================================

-- ─── 1. BANKA HESAPLARI TABLOSU ────────────────────────
-- İşletmelerin IBAN / banka bilgilerini sakladığı tablo.
-- Hem Ayarlar → Firma Bilgileri'nden, hem tur formundan yönetilebilir.

CREATE TABLE IF NOT EXISTS tenant_bank_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  bank_name TEXT NOT NULL,
  iban TEXT NOT NULL,
  account_holder TEXT,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_bank_accounts ON tenant_bank_accounts(tenant_id, is_active);

-- RLS
ALTER TABLE tenant_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_bank_accounts_select" ON tenant_bank_accounts FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "tenant_bank_accounts_insert" ON tenant_bank_accounts FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "tenant_bank_accounts_update" ON tenant_bank_accounts FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "tenant_bank_accounts_delete" ON tenant_bank_accounts FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "tenant_bank_accounts_service_all" ON tenant_bank_accounts FOR ALL
  USING (true) WITH CHECK (true);


-- ─── 2. TOURS TABLOSUNA ÖDEME ALANLARI EKLE ───────────

-- Ödeme yöntemleri
ALTER TABLE tours ADD COLUMN IF NOT EXISTS accepts_credit_card BOOLEAN DEFAULT false;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS accepts_cash BOOLEAN DEFAULT false;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS accepts_bank_transfer BOOLEAN DEFAULT false;

-- Ön ödeme / kaparo
ALTER TABLE tours ADD COLUMN IF NOT EXISTS requires_deposit BOOLEAN DEFAULT false;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2);

-- Ödeme şartları (serbest metin, AI paylaşır)
ALTER TABLE tours ADD COLUMN IF NOT EXISTS payment_terms TEXT;

-- Seçili IBAN'lar (tenant_bank_accounts referansları)
ALTER TABLE tours ADD COLUMN IF NOT EXISTS selected_iban_ids UUID[] DEFAULT '{}';

-- Galeri URL (web sitesi fotoğraf galerisi)
ALTER TABLE tours ADD COLUMN IF NOT EXISTS gallery_url TEXT;


-- ─── 3. TOUR_BOOKINGS DURUM GÜNCELLEMELERİ ───────────

-- Varsayılan status artık 'pending_approval' (AI oluşturduğunda)
-- Manuel eklenen ise 'confirmed' olarak set edilecek (uygulama katmanında)
ALTER TABLE tour_bookings ALTER COLUMN status SET DEFAULT 'pending_approval';

-- Ödeme takibi
ALTER TABLE tour_bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
-- payment_status: 'pending', 'deposit_paid', 'fully_paid', 'refunded'

ALTER TABLE tour_bookings ADD COLUMN IF NOT EXISTS payment_method TEXT;
-- payment_method: 'credit_card', 'cash', 'bank_transfer', 'mixed'

ALTER TABLE tour_bookings ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT false;
ALTER TABLE tour_bookings ADD COLUMN IF NOT EXISTS deposit_amount_paid DECIMAL(10,2);
