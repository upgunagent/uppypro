-- Add USD columns to pricing
ALTER TABLE public.pricing 
ADD COLUMN IF NOT EXISTS monthly_price_usd numeric(10, 2);

-- Add USD columns to subscriptions (for custom pricing)
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS custom_price_usd numeric(10, 2);

-- Seed USD Prices
UPDATE public.pricing 
SET monthly_price_usd = 19.00 
WHERE product_key = 'uppypro_inbox' AND billing_cycle = 'monthly';

UPDATE public.pricing 
SET monthly_price_usd = 79.00 
WHERE product_key = 'uppypro_ai' AND billing_cycle = 'monthly';
