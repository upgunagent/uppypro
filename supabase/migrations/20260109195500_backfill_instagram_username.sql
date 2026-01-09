-- Backfill instagram_username from conversations for existing customers
UPDATE customers
SET instagram_username = conversations.customer_handle
FROM conversations
WHERE customers.id = conversations.customer_id
  AND conversations.channel = 'instagram'
  AND customers.instagram_username IS NULL;
