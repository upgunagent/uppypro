-- Migration: 20260225172952_add_tenant_employees.sql
-- Create tenant_employees table
create table if not exists public.tenant_employees (
  id uuid not null default gen_random_uuid() primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS Policies for tenant_employees
alter table public.tenant_employees enable row level security;

create policy "Users can view employees in their tenant"
  on public.tenant_employees for select
  using (tenant_id in (
    select tenant_id from public.tenant_members where user_id = auth.uid()
  ));

create policy "Users can insert employees in their tenant"
  on public.tenant_employees for insert
  with check (tenant_id in (
    select tenant_id from public.tenant_members where user_id = auth.uid()
  ));

create policy "Users can update employees in their tenant"
  on public.tenant_employees for update
  using (tenant_id in (
    select tenant_id from public.tenant_members where user_id = auth.uid()
  ));

create policy "Users can delete employees in their tenant"
  on public.tenant_employees for delete
  using (tenant_id in (
    select tenant_id from public.tenant_members where user_id = auth.uid()
  ));

-- Update calendar_events table
-- User approved truncating existing events to start fresh since it's not live yet
truncate table public.calendar_events cascade;

alter table public.calendar_events
add column employee_id uuid not null references public.tenant_employees(id) on delete cascade;

