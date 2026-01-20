
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'marketing_consent') THEN
        ALTER TABLE tenants ADD COLUMN marketing_consent BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
