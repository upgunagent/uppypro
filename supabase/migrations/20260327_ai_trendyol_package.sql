-- UppyPro AI Trendyol Paketi
-- products tablosuna ekle
INSERT INTO products (key, name, description)
VALUES ('uppypro_ai_trendyol', 'UppyPro AI Trendyol', 'AI + Trendyol entegrasyonu paketi')
ON CONFLICT (key) DO NOTHING;

-- pricing tablosuna ekle
INSERT INTO pricing (product_key, billing_cycle, monthly_price_try)
VALUES ('uppypro_ai_trendyol', 'monthly', 4995)
ON CONFLICT (product_key, billing_cycle) DO NOTHING;
