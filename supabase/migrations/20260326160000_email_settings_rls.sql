-- email_settings icin RLS politikalari
ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;

-- Tenant uyeleri kendi email_settings kayitlarini okuyabilir
CREATE POLICY IF NOT EXISTS email_settings_select ON email_settings
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  );

-- Tenant owner ve agency_admin guncelleme yapabilir
CREATE POLICY IF NOT EXISTS email_settings_all ON email_settings
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members 
      WHERE user_id = auth.uid() 
      AND role IN ('tenant_owner', 'agency_admin')
    )
  );
