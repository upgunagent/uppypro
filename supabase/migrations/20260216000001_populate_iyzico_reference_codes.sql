-- Quick fix: Populate Iyzico pricing plan reference codes using pattern
-- Format: {product_key}_monthly_plan
-- This is compatible with future automation

UPDATE pricing 
SET iyzico_pricing_plan_reference_code = CONCAT(product_key, '_monthly_plan')
WHERE billing_cycle = 'monthly';

-- Verify the update
SELECT product_key, billing_cycle, iyzico_pricing_plan_reference_code 
FROM pricing 
WHERE billing_cycle = 'monthly';
