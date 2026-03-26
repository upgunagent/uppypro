-- UppyPro: create_appointment güncelleme (is_reviewed + created_by_ai eklendi)
-- Bu betiği Supabase SQL Editor üzerinden çalıştırın.

-- Önce eski fonksiyonları temizle
drop function if exists public.create_appointment(text, text, text, text, text, text, text, text, text);
drop function if exists public.create_appointment(text, text, text, text, text, text, text, text, text, text);

create or replace function public.create_appointment(
  p_tenant_id text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_start_time text,
  p_end_time text,
  p_title text,
  p_description text,
  p_employee_name text,
  p_instagram_username text default null
) returns json language plpgsql security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_customer_id uuid;
  v_event_id uuid;
  v_employee_id uuid;
  v_normalized_phone text;
begin
  v_tenant_id := p_tenant_id::uuid;

  -- Telefon numarasını normalize et (sadece rakamlar, Türkiye formatı)
  v_normalized_phone := regexp_replace(coalesce(p_customer_phone, ''), '[^0-9]', '', 'g');
  -- 05xx formatını 905xx'e çevir
  if length(v_normalized_phone) = 11 and v_normalized_phone like '0%' then
    v_normalized_phone := '9' || v_normalized_phone;
  end if;
  -- 5xx formatını 905xx'e çevir
  if length(v_normalized_phone) = 10 and v_normalized_phone like '5%' then
    v_normalized_phone := '90' || v_normalized_phone;
  end if;

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

  -- Müşteri Bul (önce email, sonra normalized telefon)
  select id into v_customer_id
  from customers
  where tenant_id = v_tenant_id::text and email = p_customer_email
  limit 1;

  -- Email ile bulunamazsa telefon numarasıyla ara
  if v_customer_id is null and v_normalized_phone != '' then
    select id into v_customer_id
    from customers
    where tenant_id = v_tenant_id::text 
      and regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = v_normalized_phone
    limit 1;
  end if;

  -- Instagram kullanıcı adıyla ara
  if v_customer_id is null and p_instagram_username is not null and p_instagram_username != '' then
    select id into v_customer_id
    from customers
    where tenant_id = v_tenant_id::text 
      and lower(instagram_username) = lower(p_instagram_username)
    limit 1;
  end if;

  if v_customer_id is null then
    -- Yeni müşteri oluştur
    insert into customers (tenant_id, full_name, email, phone, instagram_username)
    values (
      v_tenant_id::text, 
      p_customer_name, 
      p_customer_email, 
      v_normalized_phone,
      p_instagram_username
    )
    returning id into v_customer_id;
  else
    -- Mevcut müşterinin eksik bilgilerini güncelle
    update customers set
      full_name = coalesce(nullif(full_name, ''), p_customer_name),
      email = coalesce(nullif(email, ''), p_customer_email),
      phone = case when phone is null or phone = '' then v_normalized_phone else phone end,
      instagram_username = case when (instagram_username is null or instagram_username = '') and p_instagram_username is not null then p_instagram_username else instagram_username end,
      updated_at = now()
    where id = v_customer_id;
  end if;

  -- Randevu Ekle (AI tarafından oluşturulan randevular is_reviewed=false olarak işaretlenir)
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
    guest_phone,
    created_by_ai,
    is_reviewed
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
    v_normalized_phone,
    true,   -- created_by_ai = true
    false   -- is_reviewed = false (Yeni olarak gösterilecek)
  )
  returning id into v_event_id;

  return json_build_object('success', true, 'event_id', v_event_id);

exception when others then
  return json_build_object('success', false, 'error', SQLERRM);
end;
$$;
