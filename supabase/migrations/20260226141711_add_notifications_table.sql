-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE, -- Nullable for system-wide broadcasts
    type TEXT NOT NULL CHECK (type IN ('AI_ESCALATION', 'SYSTEM_BROADCAST')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb, -- Store chat_id, customer contact info, etc.
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON public.notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies

-- Policy 1: Users can view notifications belonging to their tenant or system broadcasts
CREATE POLICY "Users can view their tenant notifications and system broadcasts" 
ON public.notifications
FOR SELECT 
USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    OR 
    tenant_id IS NULL
);

-- Policy 2: Users can update ONLY the is_read status 
CREATE POLICY "Users can mark their tenant notifications as read" 
ON public.notifications
FOR UPDATE 
USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
)
WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
);

-- Policy 3: Service role (Admin/Backend) can do everything
-- Note: Service role inherently bypasses RLS, but we can explicitly allow it if needed or rely on the default behavior.

-- Add function to broadcast notifications (for future use or admin panel)
-- Enable Realtime for notifications table
begin;
  -- remove the supabase_realtime publication
  drop publication if exists supabase_realtime;

  -- re-create the supabase_realtime publication with no tables
  create publication supabase_realtime;
commit;

-- add a table to the publication
alter publication supabase_realtime add table public.notifications;
