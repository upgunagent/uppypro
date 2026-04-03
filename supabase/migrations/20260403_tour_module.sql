-- =============================================
-- UppyPro TUR MODÜLÜ — Veritabanı Migration
-- Tarih: 2026-04-03
-- =============================================

-- ─── 1. ANA TUR TANIMLARI ───────────────────────────────

CREATE TABLE IF NOT EXISTS tours (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Temel Bilgiler
  name TEXT NOT NULL,
  tour_type TEXT NOT NULL DEFAULT 'day_trip',
  -- tour_type: 'day_trip', 'half_day', 'multi_day', 'cultural', 'adventure', 'travel_package'
  description TEXT,
  
  -- Kapasite
  capacity INT NOT NULL DEFAULT 20,
  min_participants INT DEFAULT 1,
  
  -- Fiyatlandırma
  price_per_person DECIMAL(10,2),
  child_price DECIMAL(10,2),
  child_age_limit INT DEFAULT 12,
  currency TEXT DEFAULT 'TRY',
  
  -- Zaman
  departure_time TEXT,
  return_time TEXT,
  duration_hours DECIMAL(4,1),
  duration_days INT DEFAULT 1,
  
  -- Konum
  departure_point TEXT,
  route TEXT,
  destination TEXT,
  
  -- Medya
  cover_photo TEXT,
  detail_url TEXT,
  
  -- Varsayılan Haftalık Takvim (gün kısaltmaları)
  available_days TEXT[] DEFAULT '{mon,tue,wed,thu,fri,sat,sun}',
  
  -- Sezon
  season_start DATE,
  season_end DATE,
  
  -- Kategori
  vehicle_type TEXT,
  category TEXT,
  tags TEXT[],
  
  -- Ek Bilgiler
  extra_info TEXT,
  cancellation_policy TEXT,
  what_to_bring TEXT,
  
  -- Durum
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tours_tenant ON tours(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tours_active ON tours(tenant_id, is_active);


-- ─── 2. TUR TARİH OVERRIDE'LARI ────────────────────────
-- İşletme belirli tarihler için turu aktif/pasif yapabilir.
-- Override yoksa → available_days'e bakılır.
-- Override varsa → is_active değeri geçerli olur.

CREATE TABLE IF NOT EXISTS tour_date_overrides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- O güne özel override'lar (null = tours tablosundan miras)
  capacity_override INT,
  price_override DECIMAL(10,2),
  departure_time_override TEXT,
  
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tour_id, date)
);

CREATE INDEX IF NOT EXISTS idx_tour_date_overrides_lookup ON tour_date_overrides(tour_id, date);
CREATE INDEX IF NOT EXISTS idx_tour_date_overrides_tenant ON tour_date_overrides(tenant_id, tour_id);


-- ─── 3. TUR REZERVASYONLARI ────────────────────────────

CREATE TABLE IF NOT EXISTS tour_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Müşteri
  customer_id UUID REFERENCES customers(id),
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  guest_phone TEXT,
  
  -- Rezervasyon Detayları
  booking_date DATE NOT NULL,
  adult_count INT NOT NULL DEFAULT 1,
  child_count INT DEFAULT 0,
  total_guests INT GENERATED ALWAYS AS (adult_count + child_count) STORED,
  
  -- Fiyatlandırma
  adult_unit_price DECIMAL(10,2),
  child_unit_price DECIMAL(10,2),
  services_total DECIMAL(10,2) DEFAULT 0,
  total_price DECIMAL(10,2),
  
  -- Seçilen Hizmetler
  selected_services JSONB DEFAULT '[]'::jsonb,
  
  -- Durum
  status TEXT DEFAULT 'confirmed',
  -- status: 'pending', 'confirmed', 'cancelled', 'no_show'
  
  -- Notlar
  description TEXT,
  internal_note TEXT,
  
  -- AI
  created_by_ai BOOLEAN DEFAULT false,
  is_reviewed BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tour_bookings_lookup ON tour_bookings(tenant_id, tour_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_tour_bookings_date ON tour_bookings(tour_id, booking_date, status);
CREATE INDEX IF NOT EXISTS idx_tour_bookings_status ON tour_bookings(tenant_id, status);


-- ─── 4. HİZMET SEÇENEKLERİ ────────────────────────────

CREATE TABLE IF NOT EXISTS tour_service_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  is_included BOOLEAN DEFAULT false,
  is_per_person BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tour_services ON tour_service_options(tour_id, is_active);


-- ─── 5. RLS POLİTİKALARI ───────────────────────────────

ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_date_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_service_options ENABLE ROW LEVEL SECURITY;

-- tours
CREATE POLICY "tours_select" ON tours FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "tours_insert" ON tours FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "tours_update" ON tours FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "tours_delete" ON tours FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  ));

-- tour_date_overrides
CREATE POLICY "tour_date_overrides_select" ON tour_date_overrides FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "tour_date_overrides_insert" ON tour_date_overrides FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "tour_date_overrides_update" ON tour_date_overrides FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "tour_date_overrides_delete" ON tour_date_overrides FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  ));

-- tour_bookings
CREATE POLICY "tour_bookings_select" ON tour_bookings FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "tour_bookings_insert" ON tour_bookings FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "tour_bookings_update" ON tour_bookings FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "tour_bookings_delete" ON tour_bookings FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  ));

-- tour_service_options
CREATE POLICY "tour_service_options_select" ON tour_service_options FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "tour_service_options_insert" ON tour_service_options FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "tour_service_options_update" ON tour_service_options FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "tour_service_options_delete" ON tour_service_options FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  ));

-- Service role (admin) tam erişim
CREATE POLICY "tours_service_all" ON tours FOR ALL
  USING (true) WITH CHECK (true);
CREATE POLICY "tour_date_overrides_service_all" ON tour_date_overrides FOR ALL
  USING (true) WITH CHECK (true);
CREATE POLICY "tour_bookings_service_all" ON tour_bookings FOR ALL
  USING (true) WITH CHECK (true);
CREATE POLICY "tour_service_options_service_all" ON tour_service_options FOR ALL
  USING (true) WITH CHECK (true);
