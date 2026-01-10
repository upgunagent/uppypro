-- Run this script in the Supabase SQL Editor

DO $$
DECLARE
    target_email TEXT := 'otopkan@gmail.com';
    v_user_id UUID;
    v_tenant_id UUID;
BEGIN
    -- 1. Find User ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = target_email;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User not found with email %', target_email;
        RETURN;
    END IF;

    -- 2. Find Tenant ID (Assuming owner/admin of at least one tenant)
    SELECT tenant_id INTO v_tenant_id 
    FROM public.tenant_members 
    WHERE user_id = v_user_id 
    LIMIT 1;

    IF v_tenant_id IS NULL THEN
        RAISE NOTICE 'Tenant not found for user %', target_email;
        RETURN;
    END IF;

    -- 3. Ensure Products Exist (Mock data if missing)
    -- We ensure the 'ai_pro' product exists so the foreign key constraint is satisfied.
    INSERT INTO public.products (key, name, description, ai_tier, tool_limit)
    VALUES 
        ('base_inbox', 'Base Inbox', 'Standard Inbox Features', 'none', 0),
        ('ai_pro', 'UppyPro AI', 'Pro AI Features', 'pro', 1000)
    ON CONFLICT (key) DO NOTHING;

    -- 4. Clear existing subscriptions for this tenant to avoid confusion
    DELETE FROM public.subscriptions WHERE tenant_id = v_tenant_id;

    -- 5. Insert new Active Subscription
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
        'base_inbox',
        'ai_pro', -- This maps to UppyPro AI
        'monthly',
        NOW(), -- Started now
        NOW() + INTERVAL '1 month' -- Ends in 1 month
    );

    RAISE NOTICE 'SUCCESS: Subscription updated for % (Tenant ID: %). Plan set to UppyPro AI.', target_email, v_tenant_id;
END $$;
