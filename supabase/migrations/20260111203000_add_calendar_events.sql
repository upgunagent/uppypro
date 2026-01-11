create table if not exists public.calendar_events (
  id uuid not null default gen_random_uuid() primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  guest_name text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS Policies
alter table public.calendar_events enable row level security;

create policy "Users can view events in their tenant"
  on public.calendar_events for select
  using (tenant_id in (
    select tenant_id from public.tenant_members where user_id = auth.uid()
  ));

create policy "Users can insert events in their tenant"
  on public.calendar_events for insert
  with check (tenant_id in (
    select tenant_id from public.tenant_members where user_id = auth.uid()
  ));

create policy "Users can update events in their tenant"
  on public.calendar_events for update
  using (tenant_id in (
    select tenant_id from public.tenant_members where user_id = auth.uid()
  ));

create policy "Users can delete events in their tenant"
  on public.calendar_events for delete
  using (tenant_id in (
    select tenant_id from public.tenant_members where user_id = auth.uid()
  ));
