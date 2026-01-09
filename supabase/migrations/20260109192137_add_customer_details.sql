-- Add new columns to customers table for extended details
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS invoice_type text CHECK (invoice_type IN ('corporate', 'individual')),
ADD COLUMN IF NOT EXISTS tax_office text,
ADD COLUMN IF NOT EXISTS tax_number text,
ADD COLUMN IF NOT EXISTS company_address text,
ADD COLUMN IF NOT EXISTS authorized_person text,
ADD COLUMN IF NOT EXISTS tckn text,
ADD COLUMN IF NOT EXISTS individual_address text;

-- Add comments for clarity
COMMENT ON COLUMN public.customers.invoice_type IS 'corporate or individual';
COMMENT ON COLUMN public.customers.tax_number IS 'For corporate customers';
COMMENT ON COLUMN public.customers.tckn IS 'For individual customers';
