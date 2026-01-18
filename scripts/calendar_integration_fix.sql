
-- UppyPro Calendar Integration Functions for n8n AI Agent - FIX V2
-- Run this script in your Supabase SQL Editor to UPDATE existing functions

-- 1. Helper Function: Check Availability (FIXED AMBIGUITY)
create or replace function get_available_slots(
  p_tenant_id uuid,
  p_date date
) returns table (
  slot_start timestamp,
  slot_end timestamp
) language plpgsql as $$
declare
  business_start_hour int := 9;
  business_end_hour int := 18;
  
  iter_time timestamp;
  target_end_time timestamp; -- Renamed to avoid confusion with column name
  is_busy boolean;
begin
  iter_time := p_date + (business_start_hour || ' hours')::interval;
  target_end_time := p_date + (business_end_hour || ' hours')::interval;

  while iter_time < target_end_time loop
    -- Check if there is any overlapping event for this tenant
    -- We alias the table as 'ce' to prevent any column name ambiguity
    select exists (
      select 1 from calendar_events ce
      where ce.tenant_id = p_tenant_id
      and (
        (ce.start_time <= iter_time and ce.end_time > iter_time) 
        or
        (ce.start_time < (iter_time + interval '1 hour') and ce.end_time >= (iter_time + interval '1 hour')) 
        or 
        (ce.start_time >= iter_time and ce.end_time <= (iter_time + interval '1 hour')) 
      )
    ) into is_busy;

    if not is_busy then
      slot_start := iter_time;
      slot_end := iter_time + interval '1 hour';
      return next;
    end if;

    iter_time := iter_time + interval '1 hour';
  end loop;
end;
$$;
