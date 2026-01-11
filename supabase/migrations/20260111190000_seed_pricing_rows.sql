-- Ensure pricing rows exist for our standard products
-- We use ON CONFLICT DO NOTHING to avoid overwriting if they exist (though we might want to update if we want to force defaults, but DO NOTHING is safer for now)

INSERT INTO public.pricing (product_key, billing_cycle, monthly_price_try, setup_fee_try, note)
VALUES 
    ('inbox', 'monthly', 49500, 0, 'UppyPro Inbox Standard Price'),
    ('uppypro_ai', 'monthly', 249900, 0, 'UppyPro AI Standard Price')
ON CONFLICT (product_key, billing_cycle) DO UPDATE 
SET monthly_price_try = EXCLUDED.monthly_price_try 
WHERE pricing.monthly_price_try IS NULL; -- Only update if it was somehow null, otherwise keep existing
