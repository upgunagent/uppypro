-- Allow null campaign_id in customer_campaign_logs for direct/single template sends
ALTER TABLE customer_campaign_logs ALTER COLUMN campaign_id DROP NOT NULL;
