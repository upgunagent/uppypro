-- UppyPro Calendar RPC Updates for AI Agent (Multi-Employee Support)
-- Lütfen bu betiği Supabase SQL Editor üzerinden çalıştırın.

-- 1. check_availability (Güncellendi)
-- Belirtilen tarihten itibaren (o gün dahil) x gün boyunca, belirtilen personelin boş saatlerini getirir.
drop function if exists public.check_availability(text, date);
drop function if exists public.check_availability(text, date, text);

create or replace function public.check_availability(
  p_tenant_id text,
  p_date date,
  p_employee_name text
) returns table (
  available_date date,
  slot_start text,
  slot_end text
) language plpgsql security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_employee_id uuid;
  business_start_hour int := 9;
  business_end_hour int := 18;
  iter_time timestamptz;
  target_end_time timestamptz;
  is_busy boolean;
  day_offset int;
  check_date date;
begin
  -- Parametre Dönüşümleri
  begin
    v_tenant_id := p_tenant_id::uuid;
  exception when others then
    return;
  end;

  -- Personeli bul (İsimle eşleşen ilk personel)
  select id into v_employee_id 
  from tenant_employees 
  where tenant_id = v_tenant_id 
    and (name ilike p_employee_name or name ilike p_employee_name || '%')
  order by length(name) asc
  limit 1;

  if v_employee_id is null then
    -- Personel bulunamazsa boş döner
    return;
  end if;

  -- 3 günlük tarama yap (istenen gün dahil)
  for day_offset in 0..2 loop
    check_date := p_date + day_offset;
    -- Timestamp with timezone ayarlaması (Türkiye saati ile eşleşmesi için)
    -- Döngü 09:00 - 18:00 (Türkiye saati) arası dönecek
    iter_time := (check_date + (business_start_hour || ' hours')::interval)::timestamp at time zone 'Europe/Istanbul';
    target_end_time := (check_date + (business_end_hour || ' hours')::interval)::timestamp at time zone 'Europe/Istanbul';

    while iter_time < target_end_time loop
      -- Çakışma kontrolü
      select exists (
        select 1 from calendar_events ce
        where ce.tenant_id = v_tenant_id
        and ce.employee_id = v_employee_id
        and (
          (ce.start_time <= iter_time and ce.end_time > iter_time) 
          or
          (ce.start_time < (iter_time + interval '1 hour') and ce.end_time >= (iter_time + interval '1 hour')) 
          or 
          (ce.start_time >= iter_time and ce.end_time <= (iter_time + interval '1 hour')) 
        )
      ) into is_busy;

      if not is_busy then
        available_date := check_date;
        -- Sonucu n8n'e Türkiye saati metni olarak gönder
        slot_start := to_char(iter_time at time zone 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI');
        slot_end := to_char((iter_time + interval '1 hour') at time zone 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI');
        return next;
      end if;

      iter_time := iter_time + interval '1 hour';
    end loop;
  end loop;
END;
$$;


-- 3. reschedule_appointment (Güncellendi)
drop function if exists public.reschedule_appointment(uuid, timestamptz);
drop function if exists public.reschedule_appointment(uuid, timestamptz, timestamptz);
drop function if exists public.reschedule_appointment(uuid, text, text);

create or replace function public.reschedule_appointment(
  p_appointment_id uuid,
  p_new_start_time text,
  p_new_end_time text default null
) returns json language plpgsql security definer
set search_path = public
as $$
declare
  v_event record;
  v_duration interval;
  v_final_end_time timestamptz;
  v_new_start_tz timestamptz;
begin
  -- Mevcut randevuyu bul
  select * into v_event from public.calendar_events where id = p_appointment_id;
  
  if v_event is null then
    return json_build_object('success', false, 'message', 'Randevu bulunamadı');
  end if;

  -- N8N'den gelen metin saatini (UTC farksız, yerel saat) 'Europe/Istanbul' olarak yorumla
  v_new_start_tz := p_new_start_time::timestamp at time zone 'Europe/Istanbul';

  -- Bitiş zamanını belirle
  if p_new_end_time is not null then
    v_final_end_time := p_new_end_time::timestamp at time zone 'Europe/Istanbul';
  else
    -- Süreyi koru
    v_duration := v_event.end_time - v_event.start_time;
    v_final_end_time := v_new_start_tz + v_duration;
  end if;

  -- Güncelle
  update public.calendar_events
  set 
    start_time = v_new_start_tz,
    end_time = v_final_end_time,
    updated_at = now()
  where id = p_appointment_id;

  return json_build_object(
    'success', true, 
    'message', 'Randevu başarıyla ertelendi',
    'new_start_time', v_new_start_tz,
    'new_end_time', v_final_end_time
  );
exception when others then
  return json_build_object('success', false, 'message', SQLERRM);
end;
$$;
-- 2. create_appointment (Güncellendi)
drop function if exists public.create_appointment(text, text, text, text, timestamp, timestamp, text, text);
drop function if exists public.create_appointment(text, text, text, text, timestamp, timestamp, text, text, text);
drop function if exists public.create_appointment(text, text, text, text, timestamptz, timestamptz, text, text, text);
drop function if exists public.create_appointment(text, text, text, text, text, text, text, text, text);

create or replace function public.create_appointment(
  p_tenant_id text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_start_time text,
  p_end_time text,
  p_title text,
  p_description text,
  p_employee_name text
) returns json language plpgsql security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_customer_id uuid;
  v_event_id uuid;
  v_employee_id uuid;
begin
  v_tenant_id := p_tenant_id::uuid;

  -- Personeli bul
  select id into v_employee_id 
  from tenant_employees 
  where tenant_id = v_tenant_id 
    and (name ilike p_employee_name or name ilike p_employee_name || '%')
  order by length(name) asc
  limit 1;

  if v_employee_id is null then
     return json_build_object('success', false, 'error', 'Personel bulunamadı: ' || p_employee_name);
  end if;

  -- Müşteri Bul/Oluştur
  select id into v_customer_id
  from customers
  where tenant_id = v_tenant_id::text and email = p_customer_email
  limit 1;

  if v_customer_id is null then
    insert into customers (tenant_id, full_name, email, phone)
    values (v_tenant_id::text, p_customer_name, p_customer_email, p_customer_phone)
    returning id into v_customer_id;
  end if;

  -- Randevu Ekle
  insert into calendar_events (
    tenant_id,
    customer_id,
    employee_id,
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
    v_employee_id,
    p_title,
    p_description || ' (AI Tarafından Oluşturuldu)',
    (p_start_time::timestamp at time zone 'Europe/Istanbul'),
    (p_end_time::timestamp at time zone 'Europe/Istanbul'),
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
