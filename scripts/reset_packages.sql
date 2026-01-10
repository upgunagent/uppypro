-- Reset Packages and Pricing Logic
-- WARNING: This deletes all existing products and pricing!

BEGIN;

-- 1. DELETE existing data
DELETE FROM public.subscriptions; 
DELETE FROM public.pricing;
DELETE FROM public.products; 


-- 2. INSERT New Products
INSERT INTO public.products (key, name, description, ai_tier, tool_limit)
VALUES 
    -- 1. UppyPro Inbox
    ('uppypro_inbox', 'UppyPro Inbox', 'Küçük işletmeler ve butikler için.', 'none', 0),
    
    -- 2. UppyPro AI
    ('uppypro_ai', 'UppyPro AI', 'Otomasyon isteyen büyüyen markalar.', 'pro', 1000),
    
    -- 3. UppyPro Kurumsal
    ('uppypro_enterprise', 'UppyPro Kurumsal', 'Özel çözümler ve yüksek hacimler.', 'pro', 999999);


-- 3. INSERT Pricing (Only for first two)
INSERT INTO public.pricing (product_key, billing_cycle, monthly_price_try, setup_fee_try, note)
VALUES 
    -- UppyPro Inbox: 495 TL
    ('uppypro_inbox', 'monthly', 49500, 0, 'Standart Aylık Ücret'),
    
    -- UppyPro AI: 2499 TL
    ('uppypro_ai', 'monthly', 249900, 0, 'Standart Aylık Ücret');

-- Enterprise gets no public pricing entry.

COMMIT;


-- 4. Re-link the demo user (otopkan@gmail.com) to UppyPro AI text
DO $$
DECLARE
    target_email TEXT := 'otopkan@gmail.com';
    v_user_id UUID;
    v_tenant_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = target_email;
    IF v_user_id IS NOT NULL THEN
        SELECT tenant_id INTO v_tenant_id FROM public.tenant_members WHERE user_id = v_user_id LIMIT 1;
        
        IF v_tenant_id IS NOT NULL THEN
            INSERT INTO public.subscriptions (
                tenant_id, 
                status, 
                base_product_key, 
                ai_product_key, 
                billing_cycle, 
                started_at, 
                current_period_end
            )
            VALUES (
                v_tenant_id,
                'active',
                'uppypro_inbox', -- Base is required? Let's say Inbox is base.
                'uppypro_ai',    -- Add-on or main package? Schema had split. 
                                 -- If the user buys "UppyPro AI", they probably get Inbox features too.
                                 -- For simplicity in this schema: Base=Inbox, AI=Pro
                'monthly',
                NOW(),
                NOW() + INTERVAL '1 month'
            );
        END IF;
    END IF;
END $$;
