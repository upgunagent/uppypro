-- Destek Talepleri (Tickets) ve Dosya Eklentileri Modülü SQL Kurulumu
-- Bu kod tablo yapısını, depolama bucket'ını ve RLS güvenlik kurallarını içerir.

-- 1. Ana Bilet (Ticket) Tablosu
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('billing', 'subscription', 'meta_approval', 'connection_issue', 'ai_settings', 'campaign_reject', 'technical_error', 'other')),
    status TEXT DEFAULT 'open' NOT NULL CHECK (status IN ('open', 'waiting_on_user', 'closed')),
    has_unread_user_message BOOLEAN DEFAULT false,
    has_unread_admin_message BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Bilet Mesajları Tablosu
CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
    message TEXT NOT NULL,
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Depolama (Storage) Dosya Kovanı Ekleme
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ticket-attachments', 'ticket-attachments', true) 
ON CONFLICT DO NOTHING;

-- 4. Güvenlik Politikaları (RLS) Etkinleştirme
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- 5. support_tickets Kuralları
-- Tenants kendi işletmelerinin ticketlarını görebilir
CREATE POLICY "Tenants can view own tickets" 
    ON public.support_tickets FOR SELECT 
    USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

-- Tenants kendi ticketlarını ekleyebilir
CREATE POLICY "Tenants can create own tickets" 
    ON public.support_tickets FOR INSERT 
    WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

-- Tenants kendi ticket durumlarını güncelleyebilir (Kapatma/Açma)
CREATE POLICY "Tenants can update own tickets" 
    ON public.support_tickets FOR UPDATE 
    USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

-- Adminler tüm ticketları görebilir
CREATE POLICY "Admins can view all tickets" 
    ON public.support_tickets FOR SELECT 
    USING (EXISTS (SELECT 1 FROM tenant_members WHERE user_id = auth.uid() AND role = 'agency_admin'));

-- Adminler tüm ticketları güncelleyebilir
CREATE POLICY "Admins can update all tickets" 
    ON public.support_tickets FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM tenant_members WHERE user_id = auth.uid() AND role = 'agency_admin'));


-- 6. ticket_messages Kuralları
-- Tenants kendi ticketlarına ait mesajları görebilir
CREATE POLICY "Tenants can view own ticket messages" 
    ON public.ticket_messages FOR SELECT 
    USING (ticket_id IN (SELECT id FROM support_tickets WHERE tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())));

-- Tenants kendi ticketlarına mesaj atabilir
CREATE POLICY "Tenants can insert message" 
    ON public.ticket_messages FOR INSERT 
    WITH CHECK (ticket_id IN (SELECT id FROM support_tickets WHERE tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())));

-- Adminler tüm mesajları görebilir
CREATE POLICY "Admins can view all ticket messages" 
    ON public.ticket_messages FOR SELECT 
    USING (EXISTS (SELECT 1 FROM tenant_members WHERE user_id = auth.uid() AND role = 'agency_admin'));

-- Adminler tüm ticketlara mesaj atabilir
CREATE POLICY "Admins can insert all ticket messages" 
    ON public.ticket_messages FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM tenant_members WHERE user_id = auth.uid() AND role = 'agency_admin'));


-- 7. Storage Kuralları (ticket-attachments için)
CREATE POLICY "Anyone can view ticket attachments"
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'ticket-attachments');

CREATE POLICY "Authenticated users can upload ticket attachments"
    ON storage.objects FOR INSERT 
    WITH CHECK (bucket_id = 'ticket-attachments' AND auth.role() = 'authenticated');
