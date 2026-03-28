-- Migration: 20260329_resource_attributes.sql
-- Takvim kaynakları (oda, tekne, araç) desteği için tenant_employees tablosuna yeni sütunlar

-- 1. Kaynak tipi: employee | room | boat | vehicle
ALTER TABLE public.tenant_employees
ADD COLUMN IF NOT EXISTS resource_type TEXT NOT NULL DEFAULT 'employee';

-- 2. JSON formatında detaylı özellikler
-- Oda:   {"capacity": 2, "beds": 1, "bed_type": "double", "bathroom": true, "view": "sea", "floor": 3, "size_m2": 28}
-- Tekne: {"capacity": 8, "length_m": 12, "type": "gulet", "year": 2020, "engine": "200HP", "crew": true}
-- Araç:  {"category": "SUV", "brand": "BMW", "model": "X5", "year": 2023, "fuel": "benzin", "transmission": "otomatik"}
ALTER TABLE public.tenant_employees
ADD COLUMN IF NOT EXISTS attributes JSONB NOT NULL DEFAULT '{}';

-- 3. Serbest metin: standart alanlarla ifade edilemeyen ek bilgiler
-- Örn: "Mini bar dahil, yeni renovasyon, jakuzi mevcut"
ALTER TABLE public.tenant_employees
ADD COLUMN IF NOT EXISTS extra_info TEXT;

-- 4. İşletmenin tercih ettiği kaynak tipi (tenant düzeyinde)
-- Ayarlar sayfasında seçilen tip burada saklanır, sonraki girişte hatırlanır
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS resource_type_preference TEXT NOT NULL DEFAULT 'employee';
