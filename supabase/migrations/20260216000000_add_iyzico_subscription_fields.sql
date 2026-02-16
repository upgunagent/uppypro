-- 20260216000000_add_iyzico_subscription_fields.sql

-- Add Iyzico reference code to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS iyzico_product_reference_code TEXT;

-- Add Iyzico reference code to pricing table
ALTER TABLE pricing ADD COLUMN IF NOT EXISTS iyzico_pricing_plan_reference_code TEXT;

-- Add Iyzico reference codes to subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS iyzico_subscription_reference_code TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS iyzico_customer_reference_code TEXT;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_iyzico_sub_ref ON subscriptions(iyzico_subscription_reference_code);
CREATE INDEX IF NOT EXISTS idx_subscriptions_iyzico_cust_ref ON subscriptions(iyzico_customer_reference_code);
