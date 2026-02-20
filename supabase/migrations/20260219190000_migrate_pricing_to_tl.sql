
-- 20260219190000_migrate_pricing_to_tl.sql

-- 1. Mevcut ürünlerin TL fiyatlarını ve Iyzico referans kodlarını güncelle
UPDATE public.pricing
SET 
    monthly_price_try = 895,  -- 895 TL + KDV
    monthly_price_usd = NULL, -- USD fiyatı kaldırıyoruz
    iyzico_pricing_plan_reference_code = 'a12a8c6c-7fda-4be7-b845-fd74bcf8487c', -- Yeni TL Plan Referansı
    note = 'UppyPro Inbox (TL)'
WHERE product_key = 'uppypro_inbox' AND billing_cycle = 'monthly';

UPDATE public.pricing
SET 
    monthly_price_try = 3995, -- 3995 TL + KDV
    monthly_price_usd = NULL,
    iyzico_pricing_plan_reference_code = '16551506-5da3-4a46-b7ca-b786c82d7410',
    note = 'UppyPro AI (TL)'
WHERE product_key = 'uppypro_ai' AND billing_cycle = 'monthly';

-- 1.5. Benzersiz Kısıtlama Ekle (Unique Constraint)
-- ON CONFLICT kullanabilmek için bu kısıtlamanın olması şarttır.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pricing_product_key_billing_cycle_key'
    ) THEN
        ALTER TABLE public.pricing
        ADD CONSTRAINT pricing_product_key_billing_cycle_key UNIQUE (product_key, billing_cycle);
    END IF;
END $$;

-- 2. Yeni Kurumsal Paketleri Ekle (Eğer yoksa)
-- Small
INSERT INTO public.pricing (product_key, billing_cycle, monthly_price_try, monthly_price_usd, iyzico_pricing_plan_reference_code, note, setup_fee_try)
VALUES (
    'uppypro_corporate_small', 
    'monthly', 
    4995, 
    NULL, 
    '0b25350a-8a9e-488e-8298-bbf577aa8c7c', 
    'UppyPro Kurumsal Small (TL)',
    0
) ON CONFLICT (product_key, billing_cycle) DO UPDATE SET 
    monthly_price_try = EXCLUDED.monthly_price_try,
    monthly_price_usd = NULL,
    iyzico_pricing_plan_reference_code = EXCLUDED.iyzico_pricing_plan_reference_code;

-- Medium
INSERT INTO public.pricing (product_key, billing_cycle, monthly_price_try, monthly_price_usd, iyzico_pricing_plan_reference_code, note, setup_fee_try)
VALUES (
    'uppypro_corporate_medium', 
    'monthly', 
    6995, 
    NULL, 
    'af08a2ff-ba92-42ee-9c57-c740864878f5', 
    'UppyPro Kurumsal Medium (TL)',
    0
) ON CONFLICT (product_key, billing_cycle) DO UPDATE SET 
    monthly_price_try = EXCLUDED.monthly_price_try,
    monthly_price_usd = NULL,
    iyzico_pricing_plan_reference_code = EXCLUDED.iyzico_pricing_plan_reference_code;

-- Large
INSERT INTO public.pricing (product_key, billing_cycle, monthly_price_try, monthly_price_usd, iyzico_pricing_plan_reference_code, note, setup_fee_try)
VALUES (
    'uppypro_corporate_large', 
    'monthly', 
    9995, 
    NULL, 
    'e371268a-19bc-4405-9e28-10970f81a109', 
    'UppyPro Kurumsal Large (TL)',
    0
) ON CONFLICT (product_key, billing_cycle) DO UPDATE SET 
    monthly_price_try = EXCLUDED.monthly_price_try,
    monthly_price_usd = NULL,
    iyzico_pricing_plan_reference_code = EXCLUDED.iyzico_pricing_plan_reference_code;

-- XL
INSERT INTO public.pricing (product_key, billing_cycle, monthly_price_try, monthly_price_usd, iyzico_pricing_plan_reference_code, note, setup_fee_try)
VALUES (
    'uppypro_corporate_xl', 
    'monthly', 
    12995, 
    NULL, 
    '64d19b9b-48df-44e2-af2b-163741027bbd', 
    'UppyPro Kurumsal XL (TL)',
    0
) ON CONFLICT (product_key, billing_cycle) DO UPDATE SET 
    monthly_price_try = EXCLUDED.monthly_price_try,
    monthly_price_usd = NULL,
    iyzico_pricing_plan_reference_code = EXCLUDED.iyzico_pricing_plan_reference_code;
