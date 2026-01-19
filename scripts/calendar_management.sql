
-- UppyPro Calendar Management Functions
-- n8n AI Agent için Randevu Bulma, İptal Etme ve Değiştirme Fonksiyonları

-- 1. get_my_appointments (Randevularımı Bul)
create or replace function get_my_appointments(
  p_tenant_id text,
  p_identifier text -- Email veya Telefon olabilir (Basitlik için email varsayıyoruz)
) returns table (
  appointment_id uuid,
  title text,
  start_time text,
  end_time text,
  status text
) language plpgsql security definer
set search_path = public
as $$
begin
  return query
  select 
    ce.id as appointment_id,
    ce.title,
    to_char(ce.start_time at time zone 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI') as start_time,
    to_char(ce.end_time at time zone 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI') as end_time,
    'confirmed'::text as status -- Şimdilik statü kolonu olmadığı için sabit dönüyoruz
  from calendar_events ce
  join customers c on ce.customer_id = c.id
  where ce.tenant_id::text = p_tenant_id
  and (
    c.email ilike p_identifier
    or 
    ce.guest_email ilike p_identifier
  )
  and ce.start_time > now() -- Sadece gelecekteki randevular
  order by ce.start_time asc
  limit 5;
end;
$$;

-- 2. cancel_appointment (Randevu İptal Et)
create or replace function cancel_appointment(
  p_appointment_id text
) returns json language plpgsql security definer
set search_path = public
as $$
declare
  v_deleted_count int;
begin
  delete from calendar_events
  where id::text = p_appointment_id;

  get diagnostics v_deleted_count = row_count;

  if v_deleted_count > 0 then
    return json_build_object('success', true, 'message', 'Randevu başarıyla iptal edildi.');
  else
    return json_build_object('success', false, 'error', 'Randevu bulunamadı veya zaten silinmiş.');
  end if;

exception when others then
  return json_build_object('success', false, 'error', SQLERRM);
end;
$$;

-- 3. reschedule_appointment (Randevu Değiştir)
create or replace function reschedule_appointment(
  p_appointment_id text,
  p_new_start_time text,
  p_new_end_time text
) returns json language plpgsql security definer
set search_path = public
as $$
declare
  v_updated_count int;
  v_start_timestamptz timestamptz;
  v_end_timestamptz timestamptz;
begin
  v_start_timestamptz := p_new_start_time::timestamp at time zone 'Europe/Istanbul';
  v_end_timestamptz := p_new_end_time::timestamp at time zone 'Europe/Istanbul';

  update calendar_events
  set 
    start_time = v_start_timestamptz,
    end_time = v_end_timestamptz,
    updated_at = now() -- Eğer updated_at kolonu varsa günceller
  where id::text = p_appointment_id;

  get diagnostics v_updated_count = row_count;

  if v_updated_count > 0 then
    return json_build_object('success', true, 'message', 'Randevu saati güncellendi.');
  else
    return json_build_object('success', false, 'error', 'Randevu bulunamadı.');
  end if;

exception when others then
  return json_build_object('success', false, 'error', SQLERRM);
end;
$$;
