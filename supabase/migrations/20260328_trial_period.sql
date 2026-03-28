-- Add trial period fields to subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS is_trial boolean DEFAULT false;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
