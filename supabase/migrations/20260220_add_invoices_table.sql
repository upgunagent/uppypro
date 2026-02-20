-- 20260220_add_invoices_table.sql
-- Fatura yönetim sistemi için invoices tablosu

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    -- Iyzico order ile eşleştirme
    iyzico_order_reference_code TEXT,
    iyzico_subscription_reference_code TEXT,
    -- Fatura detayları
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'TRY',
    plan_name TEXT,
    payment_date TIMESTAMPTZ,
    invoice_date TIMESTAMPTZ DEFAULT NOW(),
    -- PDF dosya bilgisi (Supabase Storage)
    invoice_pdf_url TEXT,
    invoice_pdf_path TEXT,
    -- Mail durumu
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMPTZ,
    -- Ek bilgiler
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Index: tenant_id ile hızlı sorgulama
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
-- Index: order reference code ile eşleştirme
CREATE INDEX IF NOT EXISTS idx_invoices_order_ref ON invoices(iyzico_order_reference_code);

-- RLS Policies
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Admin (agency_admin) tam erişim
CREATE POLICY "admin_full_access_invoices" ON invoices
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM tenant_members tm
            WHERE tm.user_id = auth.uid()
            AND tm.role = 'agency_admin'
        )
    );

-- Tenant owner kendi faturalarını okuyabilir
CREATE POLICY "tenant_owner_read_invoices" ON invoices
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM tenant_members tm
            WHERE tm.user_id = auth.uid()
            AND tm.tenant_id = invoices.tenant_id
            AND tm.role = 'tenant_owner'
        )
    );

-- ============================================================
-- Supabase Storage: invoices bucket
-- NOT: Bu komutu Supabase Dashboard > Storage'dan manuel oluşturun
-- veya aşağıdaki SQL'i Supabase SQL Editor'da çalıştırın:
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: admin yükleme yapabilir
CREATE POLICY "admin_upload_invoices" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'invoices'
        AND EXISTS (
            SELECT 1 FROM tenant_members tm
            WHERE tm.user_id = auth.uid()
            AND tm.role = 'agency_admin'
        )
    );

-- Storage policy: herkes okuyabilir (public bucket)
CREATE POLICY "public_read_invoices" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'invoices');
