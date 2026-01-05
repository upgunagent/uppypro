-- SEED DATA

-- Products
INSERT INTO products (key, name, description, ai_tier, tool_limit) VALUES
('base_inbox', 'WhatsApp + Instagram Inbox', 'Mesajları tek panelden yönetin', 'none', 0),
('ai_starter', 'Başlangıç AI', 'Bilgi veren AI Asistanı', 'starter', 0),
('ai_medium', 'Edim AI', '2 Tool kullanabilen AI', 'medium', 2),
('ai_pro', 'Pro AI', '4 Tool kullanabilen AI', 'pro', 4)
ON CONFLICT (key) DO NOTHING;

-- Pricing (Kurus)
-- Base Inbox: 495 TL -> 49500
-- Base Setup: 2500 TL -> 250000 (Example from prompt said 2500 TL for base config, but list said annual setup free)
-- Prompt Details:
-- Base: 495 TL/ay.
-- Starter: 2499 TL/ay. Setup 10000 TL.
-- Medium: 4999 TL/ay. Setup 20000 TL.
-- Pro: 8999 TL/ay. Setup 30000 TL.
-- All annual setups are 0.

INSERT INTO pricing (product_key, billing_cycle, monthly_price_try, setup_fee_try) VALUES
-- Base
('base_inbox', 'monthly', 49500, 250000), -- 2500 TL setup assumed for base monthly
('base_inbox', 'annual',  49500, 0),      -- No setup for annual

-- Starter
('ai_starter', 'monthly', 249900, 1000000),
('ai_starter', 'annual',  249900, 0),

-- Medium
('ai_medium', 'monthly', 499900, 2000000),
('ai_medium', 'annual',  499900, 0),

-- Pro
('ai_pro', 'monthly', 899900, 3000000),
('ai_pro', 'annual',  899900, 0);

