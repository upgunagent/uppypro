
-- UppyPro Calendar Integration Functions - V7 (CUSTOMER UPSERT FIX)
-- Sorun: Randevuyu alan kişinin e-postası (otopkan@gmail.com) daha önce başka bir isimle (Naşide Çallı) kaydedilmiş.
-- Eski fonksiyon, e-postayı görünce "Bu müşteri zaten var" diyip eski kaydı (Naşide) kullanıyordu.
-- Çözüm: Bu versiyon, mevcut müşteri olsa bile Ad ve Telefon bilgilerini GÜNCELLER (Upsert).
-- Böylece randevu, doğru isimle (Özgür Topkan) görünür.

-- 1. get_available_slots_v7 (Değişiklik yok ama sürüm uyumu için v7 yapıyoruz)
create or replace function get_available_slots_v7(
  p_tenant_id text,
  p_date date
) returns table (
  slot_start text,
  slot_end text
) language plpgsql security definer
set search_path = public
as $$
declare
  business_start_hour int := 9;
  business_end_hour int := 18;
  iter_time timestamptz;
  target_end_time timestamptz;
  is_busy boolean;
begin
  iter_time := (p_date + (business_start_hour || ' hours')::interval) at time zone 'Europe/Istanbul';
  target_end_time := (p_date + (business_end_hour || ' hours')::interval) at time zone 'Europe/Istanbul';

  while iter_time < target_end_time loop
    select exists (
      select 1 from calendar_events ce
      where ce.tenant_id::text = p_tenant_id::text
      and (
        (ce.start_time < (iter_time + interval '1 hour') and ce.end_time > iter_time)
      )
    ) into is_busy;

    if not is_busy then
      slot_start := to_char(iter_time at time zone 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI:SS');
      slot_end := to_char((iter_time + interval '1 hour') at time zone 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI:SS');
      return next;
    end if;

    iter_time := iter_time + interval '1 hour';
  end loop;
end;
$$;

-- 2. create_appointment_v7 (Müşteri Bilgilerini Günceller)
create or replace function create_appointment_v7(
  p_tenant_id text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_start_time text,
  p_end_time text,
  p_title text,
  p_description text
) returns json language plpgsql security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_event_id uuid;
  v_start_timestamptz timestamptz;
  v_end_timestamptz timestamptz;
  v_tenant_uuid uuid;
begin
  -- Güvenli UUID dönüşümü (Insert için)
  begin
    v_tenant_uuid := p_tenant_id::uuid;
  exception when others then
    return json_build_object('success', false, 'error', 'Invalid UUID format for tenant_id');
  end;

  v_start_timestamptz := p_start_time::timestamp at time zone 'Europe/Istanbul';
  v_end_timestamptz := p_end_time::timestamp at time zone 'Europe/Istanbul';

  -- 1. Müşteri Bul (Text query ile)
  select id into v_customer_id
  from customers
  where tenant_id::text = p_tenant_id::text
  and email = p_customer_email
  limit 1;

  -- 2. Müşteri İşlemleri (Upsert Mantığı)
  if v_customer_id is not null then
    -- VARSA GÜNCELLE (Yeni isim ve telefonu kaydet)
    update customers
    set full_name = p_customer_name,
        phone = p_customer_phone
    where id = v_customer_id;
  else
    -- YOKSA OLUŞTUR
    insert into customers (tenant_id, full_name, email, phone)
    values (v_tenant_uuid, p_customer_name, p_customer_email, p_customer_phone)
    returning id into v_customer_id;
  end if;

  -- 3. Randevu Ekle
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
    v_tenant_uuid,
    v_customer_id,
    p_title,
    p_description,
    v_start_timestamptz,
    v_end_timestamptz,
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
