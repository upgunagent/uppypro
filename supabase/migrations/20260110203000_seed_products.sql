-- Insert missing products to satisfy FK constraints
INSERT INTO public.products (key, name, description, ai_tier, tool_limit)
VALUES 
    ('base_inbox', 'UppyPro Inbox', 'Temel mesajlaşma paketi', 'none', 0),
    ('uppypro_ai', 'UppyPro AI', 'Yapay zeka özellikleri', 'medium', 50),
    ('uppypro_enterprise', 'UppyPro Kurumsal', 'Kurumsal özellikler ve otomasyon', 'pro', 9999)
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name; -- Update just in case

-- Ensure pricing exists too if needed, though error was on base_product_key
