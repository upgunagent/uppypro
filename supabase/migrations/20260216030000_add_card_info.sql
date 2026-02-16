-- Add card info columns to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS card_last4 VARCHAR(4),
ADD COLUMN IF NOT EXISTS card_brand VARCHAR(50),
ADD COLUMN IF NOT EXISTS card_association VARCHAR(50);
