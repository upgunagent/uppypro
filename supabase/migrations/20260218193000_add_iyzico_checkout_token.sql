-- 20260218193000_add_iyzico_checkout_token.sql

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS iyzico_checkout_token TEXT;
CREATE INDEX IF NOT EXISTS idx_subscriptions_iyzico_token ON subscriptions(iyzico_checkout_token);
