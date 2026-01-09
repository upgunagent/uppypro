-- Force update instagram_username from conversations
-- Using a subquery to ensure we get the latest non-empty handle for each customer

UPDATE customers c
SET instagram_username = sub.handle
FROM (
  SELECT DISTINCT ON (customer_id) 
    customer_id, 
    customer_handle as handle
  FROM conversations
  WHERE channel = 'instagram' 
    AND customer_id IS NOT NULL 
    AND customer_handle IS NOT NULL 
    AND customer_handle <> ''
  ORDER BY customer_id, created_at DESC
) sub
WHERE c.id = sub.customer_id;
