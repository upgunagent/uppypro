
-- UppyPro Calendar Integration Functions - V5 (TIMEZONE FIX)
-- Sorun: Sunucu saati UTC çalışıyor, Türkiye saati UTC+3.
-- Eski fonksiyon 14:00'e bakarken aslında UTC 14:00'e (Türkiye saatiyle 17:00'ye) bakıyordu.
-- Bu yüzden 14:00'teki (UTC 11:00) randevuyu görmüyordu.
-- Bu versiyon saatleri 'Europe/Istanbul' dilimine göre ayarlar.

-- 1. get_available_slots_v5 (Timezone Aware)
create or replace function get_available_slots_v5(
  p_tenant_id text,
  p_date date
) returns table (
  slot_start text, -- n8n'e net saat gitmesi için text döndürüyoruz
  slot_end text
) language plpgsql security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  business_start_hour int := 9;
  business_end_hour int := 18;
  
  -- Türkiye saatine göre başlangıç ve bitiş
  iter_time timestamptz;
  target_end_time timestamptz;
  
  is_busy boolean;
begin
  -- Text -> UUID
  begin
    v_tenant_id := p_tenant_id::uuid;
  exception when others then
    return;
  end;
  
  -- Döngü başlangıcını İstanbul saatine göre ayarla
  -- Örnek: p_date 2026-01-19 ise, 09:00 İstanbul saati = 06:00 UTC olur.
  -- 'at time zone' kullanımı ile tarihi o bölgenin saatine çeviriyoruz.
  iter_time := (p_date + (business_start_hour || ' hours')::interval) at time zone 'Europe/Istanbul';
  target_end_time := (p_date + (business_end_hour || ' hours')::interval) at time zone 'Europe/Istanbul';

  while iter_time < target_end_time loop
    -- Çakışma kontrolü (Veritabanındaki UTC verisiyle karşılaştırır)
    select exists (
      select 1 from calendar_events ce
      where ce.tenant_id = v_tenant_id
      and (
        (ce.start_time < (iter_time + interval '1 hour') and ce.end_time > iter_time)
      )
    ) into is_busy;

    if not is_busy then
      -- Çıktıyı n8n'in yanlış anlamaması için formatlı text olarak veriyoruz
      -- Örnek: "2026-01-19 14:00:00"
      slot_start := to_char(iter_time at time zone 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI:SS');
      slot_end := to_char((iter_time + interval '1 hour') at time zone 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI:SS');
      return next;
    end if;

    iter_time := iter_time + interval '1 hour';
  end loop;
end;
$$;

-- 2. create_appointment_v5 (Timezone Aware)
create or replace function create_appointment_v5(
  p_tenant_id text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_start_time text, -- n8n'den "2026-01-19 14:00:00" gibi text alacak
  p_end_time text,
  p_title text,
  p_description text
) returns json language plpgsql security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_customer_id uuid;
  v_event_id uuid;
  
  -- Dönüştürülmüş gerçek zamanlar
  v_start_timestamptz timestamptz;
  v_end_timestamptz timestamptz;
begin
  v_tenant_id := p_tenant_id::uuid;

  -- Gelen metin formatındaki tarihi İstanbul saati kabul edip UTC'ye çeviriyoruz
  -- "2026-01-19 14:00:00" -> Europe/Istanbul -> Database (timestamptz)
  v_start_timestamptz := p_start_time::timestamp at time zone 'Europe/Istanbul';
  v_end_timestamptz := p_end_time::timestamp at time zone 'Europe/Istanbul';

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

  -- 2. Randevu Ekle
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
