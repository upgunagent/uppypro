
-- UppyPro Calendar Integration Functions - V4 (SECURITY DEFINER FIX)
-- Bu versiyon, "SECURITY DEFINER" yetkisi içerir.
-- Bu sayede n8n (Anonim kullanıcı), tablodaki RLS kurallarına takılmadan
-- takvimi okuyabilir ve randevu yazabilir.

-- 1. get_available_slots_v4
create or replace function get_available_slots_v4(
  p_tenant_id text,
  p_date date
) returns table (
  slot_start timestamp,
  slot_end timestamp
) language plpgsql security definer -- <--- KİLİT NOKTA: Admin yetkisiyle çalışır
set search_path = public -- Güvenlik gereği path sabitlenir
as $$
declare
  v_tenant_id uuid;
  business_start_hour int := 9;
  business_end_hour int := 18;
  iter_time timestamp without time zone;
  target_end_time timestamp without time zone;
  is_busy boolean;
begin
  -- Text -> UUID
  begin
    v_tenant_id := p_tenant_id::uuid;
  exception when others then
    return;
  end;
  
  iter_time := p_date + (business_start_hour || ' hours')::interval;
  target_end_time := p_date + (business_end_hour || ' hours')::interval;

  while iter_time < target_end_time loop
    -- RLS bypass edildiği için gerçek doluluk oranını görür
    select exists (
      select 1 from calendar_events ce
      where ce.tenant_id = v_tenant_id
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

-- 2. create_appointment_v4
create or replace function create_appointment_v4(
  p_tenant_id text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_title text,
  p_description text
) returns json language plpgsql security definer -- <--- KİLİT NOKTA
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_customer_id uuid;
  v_event_id uuid;
begin
  v_tenant_id := p_tenant_id::uuid;

  -- 1. Müşteri Bul/Oluştur
  select id into v_customer_id
  from customers
  where tenant_id = v_tenant_id and email = p_customer_email
  limit 1;

  if v_customer_id is null then
    insert into customers (tenant_id, full_name, email, phone)
    values (v_tenant_id, p_customer_name, p_customer_email, p_customer_phone)
    returning id into v_customer_id;
  end if;

  -- 2. Randevu Ekle (RLS olmadan)
  insert into calendar_events (
    tenant_id,
    customer_id,
    title,
    description,
    start_time,
    end_time,
    guest_name,
    guest_email,
    guest_phone
  ) values (
    v_tenant_id,
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

  return json_build_object('success', true, 'event_id', v_event_id);

exception when others then
  return json_build_object('success', false, 'error', SQLERRM);
end;
$$;
