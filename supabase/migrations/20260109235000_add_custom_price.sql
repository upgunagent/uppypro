-- Add custom_price_try to subscriptions for negotiated enterprise deals
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS custom_price_try INT; -- Price in Kurus

-- RLS should already cover this as it's the subscriptions table, but ensuring members can read is good.
-- (Existing policy "Members can view subscriptions" covers select *)
