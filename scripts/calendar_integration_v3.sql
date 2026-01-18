
-- UppyPro Calendar Integration Functions - V3 (Final Fix)
-- Eski fonksiyonlardaki önbellek/çakışma sorunlarını aşmak için fonksiyon isimlerini değiştirdik.
-- Lütfen bu scripti çalıştırın ve n8n'deki URL kısmını güncelleyin.

-- 1. Yeni: get_available_slots_v3 (İsim değişti + Text/UUID fix + Parametre fix)
create or replace function get_available_slots_v3(
  p_tenant_id text, -- Veriyi text olarak alıp içeride çeviriyoruz
  p_date date
) returns table (
  slot_start timestamp,
  slot_end timestamp
) language plpgsql as $$
declare
  v_tenant_id uuid;
  business_start_hour int := 9;
  business_end_hour int := 18;
  iter_time timestamp without time zone;
  target_end_time timestamp without time zone; -- Değişken adı çakışmasını önledik
  is_busy boolean;
begin
  -- Text -> UUID güvenli dönüşüm
  begin
    v_tenant_id := p_tenant_id::uuid;
  exception when others then
    return;
  end;
  
  -- Tarih hesaplamaları
  iter_time := p_date + (business_start_hour || ' hours')::interval;
  target_end_time := p_date + (business_end_hour || ' hours')::interval;

  while iter_time < target_end_time loop
    -- Çakışma kontrolü
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

-- 2. Yeni: create_appointment_v3 (İsim değişti + Timestamptz desteği)
create or replace function create_appointment_v3(
  p_tenant_id text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_start_time timestamptz, -- Saat dilimi uyumu için timestamptz yaptık
  p_end_time timestamptz,
  p_title text,
  p_description text
) returns json language plpgsql as $$
declare
  v_tenant_id uuid;
  v_customer_id uuid;
  v_event_id uuid;
begin
  -- UUID Dönüşümü
  v_tenant_id := p_tenant_id::uuid;

  -- 1. Müşteriyi Bul
  select id into v_customer_id
  from customers
  where tenant_id = v_tenant_id and email = p_customer_email
  limit 1;

  -- 2. Yoksa Oluştur
  if v_customer_id is null then
    insert into customers (tenant_id, full_name, email, phone)
    values (v_tenant_id, p_customer_name, p_customer_email, p_customer_phone)
    returning id into v_customer_id;
  end if;

  -- 3. Randevu Oluştur
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

  return json_build_object('success', true, 'event_id', v_event_id, 'customer_id', v_customer_id);

exception when others then
  return json_build_object('success', false, 'error', SQLERRM);
end;
$$;
