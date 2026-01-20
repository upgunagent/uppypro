-- Drop previous functions to ensure clean slate
DROP FUNCTION IF EXISTS public.get_my_appointments(text, text);
DROP FUNCTION IF EXISTS public.cancel_appointment(uuid);
-- Drop old reschedule signature
DROP FUNCTION IF EXISTS public.reschedule_appointment(uuid, timestamptz);
-- Drop potential new signature just in case
DROP FUNCTION IF EXISTS public.reschedule_appointment(uuid, timestamptz, timestamptz);

-- Function to get appointments for a customer
-- Returns future appointments for a customer identified by email or phone within a specific tenant
-- Checks both the linked customer record AND direct guest fields on the event
-- Returns times in 'Europe/Istanbul' timezone as text to ensure correct AI interpretation
CREATE OR REPLACE FUNCTION public.get_my_appointments(
  p_identifier TEXT,
  p_tenant_id TEXT
)
RETURNS TABLE (
  appointment_id UUID,
  title TEXT,
  start_time TEXT, -- Metin olarak formatlanmış saat
  end_time TEXT,   -- Metin olarak formatlanmış saat
  description TEXT,
  guest_name TEXT,
  status TEXT 
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Müşteri ID bulma
  SELECT c.id INTO v_customer_id
  FROM public.customers c
  WHERE c.tenant_id = p_tenant_id
    AND (
      c.email = p_identifier 
      OR c.phone = p_identifier
      OR c.email = trim(p_identifier)
      OR c.phone = trim(p_identifier)
    )
  LIMIT 1;

  -- Sonuçları döndür
  RETURN QUERY
  SELECT 
    ce.id AS appointment_id, 
    ce.title, 
    -- UTC -> Istanbul saati (Metin)
    to_char(ce.start_time AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI:SS') as start_time,
    to_char(ce.end_time AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI:SS') as end_time,
    ce.description,
    ce.guest_name,
    'confirmed'::text as status
  FROM public.calendar_events ce
  WHERE ce.tenant_id::text = p_tenant_id 
    AND ce.start_time >= now()
    AND (
      (v_customer_id IS NOT NULL AND ce.customer_id = v_customer_id)
      OR ce.guest_email = p_identifier
      OR ce.guest_phone = p_identifier
    )
  ORDER BY ce.start_time ASC;
END;
$$;

-- Randevu İptal Fonksiyonu
CREATE OR REPLACE FUNCTION public.cancel_appointment(
  p_appointment_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_id UUID;
BEGIN
  DELETE FROM public.calendar_events
  WHERE id = p_appointment_id
  RETURNING id INTO v_deleted_id;

  IF v_deleted_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Randevu bulunamadı veya zaten iptal edilmiş');
  END IF;

  RETURN json_build_object('success', true, 'message', 'Randevu başarıyla iptal edildi');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Randevu Erteleme/Değiştirme Fonksiyonu
-- Updated to accept p_new_end_time because n8n sends it
CREATE OR REPLACE FUNCTION public.reschedule_appointment(
  p_appointment_id UUID,
  p_new_start_time TIMESTAMPTZ,
  p_new_end_time TIMESTAMPTZ DEFAULT NULL -- Optional, calculated if null
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event record;
  v_duration interval;
  v_final_end_time TIMESTAMPTZ;
BEGIN
  -- Mevcut randevuyu bul
  SELECT * INTO v_event FROM public.calendar_events WHERE id = p_appointment_id;
  
  IF v_event IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Randevu bulunamadı');
  END IF;

  -- Bitiş zamanını belirle
  IF p_new_end_time IS NOT NULL THEN
    v_final_end_time := p_new_end_time;
  ELSE
    -- Süreyi koru
    v_duration := v_event.end_time - v_event.start_time;
    v_final_end_time := p_new_start_time + v_duration;
  END IF;

  -- Güncelle
  UPDATE public.calendar_events
  SET 
    start_time = p_new_start_time,
    end_time = v_final_end_time,
    updated_at = now()
  WHERE id = p_appointment_id;

  RETURN json_build_object(
    'success', true, 
    'message', 'Randevu başarıyla ertelendi',
    'new_start_time', p_new_start_time,
    'new_end_time', v_final_end_time
  );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- İzinleri ver
GRANT EXECUTE ON FUNCTION public.get_my_appointments(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_appointment(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reschedule_appointment(uuid, timestamptz, timestamptz) TO anon, authenticated, service_role;
