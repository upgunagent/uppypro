-- Backfill profile_pic from conversations
-- Prefer latest non-null profile_pic

UPDATE customers c
SET profile_pic = sub.pic
FROM (
  SELECT DISTINCT ON (customer_id) 
    customer_id, 
    profile_pic as pic
  FROM conversations
  WHERE customer_id IS NOT NULL 
    AND profile_pic IS NOT NULL 
    AND profile_pic <> ''
  ORDER BY customer_id, created_at DESC
) sub
WHERE c.id = sub.customer_id;
