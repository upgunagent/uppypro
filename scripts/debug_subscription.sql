-- Check subscriptions for the tenant ID seen in screenshots
SELECT * FROM public.subscriptions 
WHERE tenant_id = '42097e86-dba0-4307-b6fb-fb72e2e6b8a2';

-- Also check if any other subscriptions exist
SELECT count(*) FROM public.subscriptions;

-- Check exact tenant ID
SELECT id, name FROM public.tenants WHERE id = '42097e86-dba0-4307-b6fb-fb72e2e6b8a2';
