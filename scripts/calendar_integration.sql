
-- UppyPro Calendar Integration Functions for n8n AI Agent
-- Run this script in your Supabase SQL Editor

-- 1. Helper Function: Check Availability
-- Returns available text slots blocks for a given date range
-- Assumes business hours 09:00 - 18:00
create or replace function get_available_slots(
  p_tenant_id uuid,
  p_date date
) returns table (
  slot_start timestamp,
  slot_end timestamp
) language plpgsql as $$
declare
  -- Define business hours (can be parameterized or fetched from settings table later)
  business_start_hour int := 9;
  business_end_hour int := 18;
  
  iter_time timestamp;
  end_time timestamp;
  is_busy boolean;
begin
  -- Start from the beginning of business day
  iter_time := p_date + (business_start_hour || ' hours')::interval;
  end_time := p_date + (business_end_hour || ' hours')::interval;

  -- Loop through the day in 1-hour increments (can be changed to 30 mins)
  while iter_time < end_time loop
    -- Check if there is any overlapping event for this tenant
    select exists (
      select 1 from calendar_events
      where tenant_id = p_tenant_id
      and (
        (start_time <= iter_time and end_time > iter_time) -- Starts before or at slot, ends after start
        or
        (start_time < (iter_time + interval '1 hour') and end_time >= (iter_time + interval '1 hour')) -- Starts inside slot
        or 
        (start_time >= iter_time and end_time <= (iter_time + interval '1 hour')) -- Completely inside
      )
    ) into is_busy;

    -- If not busy, return this slot
    if not is_busy then
      slot_start := iter_time;
      slot_end := iter_time + interval '1 hour';
      return next;
    end if;

    -- Advance 1 hour
    iter_time := iter_time + interval '1 hour';
  end loop;
end;
$$;

-- 2. Action Function: Create Appointment from AI
-- Handles customer lookup/creation and event insertion in one go
create or replace function create_appointment_from_ai(
  p_tenant_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_start_time timestamp,
  p_end_time timestamp,
  p_title text,
  p_description text
) returns json language plpgsql as $$
declare
  v_customer_id uuid;
  v_event_id uuid;
begin
  -- 1. Try to find existing customer by email
  select id into v_customer_id
  from customers
  where tenant_id = p_tenant_id and email = p_customer_email
  limit 1;

  -- 2. If not found, create new customer
  if v_customer_id is null then
    insert into customers (tenant_id, full_name, email, phone)
    values (p_tenant_id, p_customer_name, p_customer_email, p_customer_phone)
    returning id into v_customer_id;
  end if;

  -- 3. Create Calendar Event
  insert into calendar_events (
    tenant_id,
    customer_id,
    title,
    description,
    start_time,
    end_time,
    guest_name, -- Backup info
    guest_email,
    guest_phone
  ) values (
    p_tenant_id,
    v_customer_id,
    p_title,
    p_description || ' (AI Tarafından Oluşturuldu)',
    p_start_time,
    p_end_time,
    p_customer_name,
    p_customer_email,
    p_customer_phone
  )
  returning id into v_event_id;

  return json_build_object('success', true, 'event_id', v_event_id, 'customer_id', v_customer_id);

exception when others then
  return json_build_object('success', false, 'error', SQLERRM);
end;
$$;
