
-- Check table structure and policies for tenant_members
SELECT * FROM pg_policies WHERE tablename = 'tenant_members';

-- Check RLS enabled
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'tenant_members';

-- Check roles enum if it exists, or just sample data to see role values (masked)
SELECT role FROM tenant_members LIMIT 10;
