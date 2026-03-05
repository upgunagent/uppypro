-- Fix: campaigns.template_id should be text (Meta template name), not UUID
-- The template info comes from Meta API and doesn't have a local UUID

-- Drop FK constraint and change type
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_template_id_fkey;
ALTER TABLE campaigns ALTER COLUMN template_id TYPE text;

-- Add columns to store template info without a local DB row
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS template_name text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS template_language text DEFAULT 'tr';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS variable_mappings JSONB DEFAULT '{}'::jsonb;

-- Also add metadata column to customer_campaign_logs for storing row context
ALTER TABLE customer_campaign_logs ADD COLUMN IF NOT EXISTS row_metadata JSONB DEFAULT '{}'::jsonb;
