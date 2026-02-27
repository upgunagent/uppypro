-- 1. get_my_appointments (Randevularımı Bul) - Güncellendi
drop function if exists public.get_my_appointments(text, text);

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
    -- Personel adını title sonuna ekliyoruz ki yapay zeka görsün
    case 
      when te.name is not null then ce.title || ' (Personel: ' || te.name || ')'
      else ce.title 
    end as title,
    to_char(ce.start_time at time zone 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI') as start_time,
    to_char(ce.end_time at time zone 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI') as end_time,
    'confirmed'::text as status
  from calendar_events ce
  join customers c on ce.customer_id = c.id
  left join tenant_employees te on ce.employee_id = te.id
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
