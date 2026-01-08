create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade not null,
  note text not null,
  created_at timestamptz default now(),
  created_by uuid default auth.uid()
);

alter table public.customer_notes enable row level security;

create policy "Users can view notes of their tenant"
  on public.customer_notes for select
  using (
    exists (
      select 1 from public.customers
      where customers.id = customer_notes.customer_id
      and customers.tenant_id in (
        select tenant_id::text from public.tenant_members where user_id = auth.uid()
      )
    )
  );

create policy "Users can insert notes for their tenant"
  on public.customer_notes for insert
  with check (
    exists (
      select 1 from public.customers
      where customers.id = customer_notes.customer_id
      and customers.tenant_id in (
        select tenant_id::text from public.tenant_members where user_id = auth.uid()
      )
    )
  );

create policy "Users can delete notes of their tenant"
  on public.customer_notes for delete
  using (
    exists (
      select 1 from public.customers
      where customers.id = customer_notes.customer_id
      and customers.tenant_id in (
        select tenant_id::text from public.tenant_members where user_id = auth.uid()
      )
    )
  );
