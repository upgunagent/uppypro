-- Insert pricing for UppyPro AI (ai_pro)
-- 2499 TL = 249900 kurus

INSERT INTO public.pricing (product_key, billing_cycle, monthly_price_try, setup_fee_try, note)
VALUES 
    ('ai_pro', 'monthly', 249900, 0, 'Standard Monthly Price')
ON CONFLICT DO NOTHING;

-- Also ensure fetching works by checking what we have
-- SELECT * FROM pricing;
