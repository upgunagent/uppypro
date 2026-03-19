-- update_customer: AI'nın müşteri bilgilerini güncellemesi için RPC fonksiyonu
-- Bu betiği Supabase SQL Editor üzerinden çalıştırın.

drop function if exists public.update_customer(text, text, text, text);

create or replace function public.update_customer(
  p_tenant_id text,
  p_customer_phone text,
  p_field text,
  p_value text
) returns json language plpgsql security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_customer_id uuid;
  v_normalized_phone text;
begin
  v_tenant_id := p_tenant_id::uuid;

  -- Telefon numarasını normalize et
  v_normalized_phone := regexp_replace(coalesce(p_customer_phone, ''), '[^0-9]', '', 'g');
  if length(v_normalized_phone) = 11 and v_normalized_phone like '0%' then
    v_normalized_phone := '9' || v_normalized_phone;
  end if;
  if length(v_normalized_phone) = 10 and v_normalized_phone like '5%' then
    v_normalized_phone := '90' || v_normalized_phone;
  end if;

  -- Müşteriyi telefon numarasıyla bul
  select id into v_customer_id
  from customers
  where tenant_id = v_tenant_id::text
    and regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = v_normalized_phone
  limit 1;

  if v_customer_id is null then
    return json_build_object('success', false, 'error', 'Müşteri bulunamadı: ' || p_customer_phone);
  end if;

  -- İzin verilen alanları güncelle
  if p_field = 'full_name' then
    update customers set full_name = p_value, updated_at = now() where id = v_customer_id;
  elsif p_field = 'email' then
    update customers set email = p_value, updated_at = now() where id = v_customer_id;
  elsif p_field = 'phone' then
    -- Yeni telefon numarasını da normalize et
    declare
      v_new_phone text;
    begin
      v_new_phone := regexp_replace(coalesce(p_value, ''), '[^0-9]', '', 'g');
      if length(v_new_phone) = 11 and v_new_phone like '0%' then
        v_new_phone := '9' || v_new_phone;
      end if;
      if length(v_new_phone) = 10 and v_new_phone like '5%' then
        v_new_phone := '90' || v_new_phone;
      end if;
      update customers set phone = v_new_phone, updated_at = now() where id = v_customer_id;
    end;
  elsif p_field = 'company_name' then
    update customers set company_name = p_value, updated_at = now() where id = v_customer_id;
  elsif p_field = 'instagram_username' then
    update customers set instagram_username = p_value, updated_at = now() where id = v_customer_id;
  else
    return json_build_object('success', false, 'error', 'Geçersiz alan: ' || p_field || '. İzin verilen alanlar: full_name, email, phone, company_name, instagram_username');
  end if;

  return json_build_object('success', true, 'message', p_field || ' başarıyla güncellendi');

exception when others then
  return json_build_object('success', false, 'error', SQLERRM);
end;
$$;
