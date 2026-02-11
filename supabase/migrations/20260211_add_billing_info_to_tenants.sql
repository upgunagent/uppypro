-- Add billing info columns to tenants table
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS billing_type text CHECK (billing_type IN ('individual', 'corporate')) DEFAULT 'individual',
ADD COLUMN IF NOT EXISTS tax_office text,
ADD COLUMN IF NOT EXISTS tax_number text,
ADD COLUMN IF NOT EXISTS tckn text,
ADD COLUMN IF NOT EXISTS full_name text, -- For individual billing name if different from owner
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS district text;

-- Add comment
COMMENT ON COLUMN tenants.billing_type IS 'Billing type: individual or corporate';
