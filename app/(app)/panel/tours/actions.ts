"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// ─── TUR CRUD ───

export async function getTours(tenantId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tours")
    .select(`
      *,
      tour_service_options(id, name, price, is_included, is_per_person, is_active, sort_order)
    `)
    .eq("tenant_id", tenantId)
    .order("sort_order")
    .order("name");

  if (error) {
    console.error("[Tours] Fetch error:", error);
    return [];
  }
  return data || [];
}

export async function createTour(tenantId: string, tourData: Record<string, any>) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tours")
    .insert({
      tenant_id: tenantId,
      name: tourData.name,
      tour_type: tourData.tour_type || "day_trip",
      description: tourData.description || null,
      capacity: tourData.capacity || 20,
      min_participants: tourData.min_participants || 1,
      price_per_person: tourData.price_per_person || null,
      child_price: tourData.child_price ?? null,
      child_age_limit: tourData.child_age_limit || 12,
      currency: tourData.currency || "TRY",
      departure_time: tourData.departure_time || null,
      return_time: tourData.return_time || null,
      duration_hours: tourData.duration_hours || null,
      duration_days: tourData.duration_days || 1,
      departure_point: tourData.departure_point || null,
      route: tourData.route || null,
      destination: tourData.destination || null,
      cover_photo: tourData.cover_photo || null,
      detail_url: tourData.detail_url || null,
      available_days: tourData.available_days || ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      season_start: tourData.season_start || null,
      season_end: tourData.season_end || null,
      vehicle_type: tourData.vehicle_type || null,
      category: tourData.category || null,
      extra_info: tourData.extra_info || null,
      cancellation_policy: tourData.cancellation_policy || null,
      what_to_bring: tourData.what_to_bring || null,
      is_active: tourData.is_active !== false,
      // Ödeme bilgileri
      accepts_credit_card: tourData.accepts_credit_card || false,
      accepts_cash: tourData.accepts_cash || false,
      accepts_bank_transfer: tourData.accepts_bank_transfer || false,
      requires_deposit: tourData.requires_deposit || false,
      deposit_amount: tourData.deposit_amount || null,
      payment_terms: tourData.payment_terms || null,
      selected_iban_ids: tourData.selected_iban_ids || [],
      gallery_url: tourData.gallery_url || null,
    })
    .select()
    .single();

  if (error) {
    console.error("[Tours] Create error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/panel/tours");
  revalidatePath("/panel/settings");
  return { success: true, tour: data };
}

export async function updateTour(tourId: string, tourData: Record<string, any>) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tours")
    .update({
      ...tourData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tourId)
    .select()
    .single();

  if (error) {
    console.error("[Tours] Update error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/panel/tours");
  revalidatePath("/panel/settings");
  return { success: true, tour: data };
}

export async function deleteTour(tourId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tours")
    .delete()
    .eq("id", tourId);

  if (error) {
    console.error("[Tours] Delete error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/panel/tours");
  revalidatePath("/panel/settings");
  return { success: true };
}

// ─── HİZMET SEÇENEKLERİ ───

export async function addTourService(tourId: string, tenantId: string, serviceData: Record<string, any>) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tour_service_options")
    .insert({
      tour_id: tourId,
      tenant_id: tenantId,
      name: serviceData.name,
      description: serviceData.description || null,
      price: serviceData.price || 0,
      is_included: serviceData.is_included || false,
      is_per_person: serviceData.is_per_person !== false,
      is_active: true,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/panel/tours");
  return { success: true, service: data };
}

export async function updateTourService(serviceId: string, serviceData: Record<string, any>) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tour_service_options")
    .update(serviceData)
    .eq("id", serviceId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/panel/tours");
  return { success: true, service: data };
}

export async function deleteTourService(serviceId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tour_service_options")
    .delete()
    .eq("id", serviceId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/panel/tours");
  return { success: true };
}

// ─── TARİH OVERRIDE'LARI ───

export async function getTourDateOverrides(tourId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tour_date_overrides")
    .select("*")
    .eq("tour_id", tourId)
    .order("date");

  if (error) return [];
  return data || [];
}

export async function setTourDateOverride(
  tourId: string,
  tenantId: string,
  date: string,
  isActive: boolean,
  options?: { capacityOverride?: number; priceOverride?: number; note?: string }
) {
  const supabase = await createClient();

  // Upsert: varsa güncelle, yoksa ekle
  const { data, error } = await supabase
    .from("tour_date_overrides")
    .upsert(
      {
        tour_id: tourId,
        tenant_id: tenantId,
        date,
        is_active: isActive,
        capacity_override: options?.capacityOverride ?? null,
        price_override: options?.priceOverride ?? null,
        note: options?.note ?? null,
      },
      { onConflict: "tour_id,date" }
    )
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/panel/tours");
  return { success: true, override: data };
}

export async function removeTourDateOverride(tourId: string, date: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tour_date_overrides")
    .delete()
    .eq("tour_id", tourId)
    .eq("date", date);

  if (error) return { success: false, error: error.message };
  revalidatePath("/panel/tours");
  return { success: true };
}

// ─── REZERVASYON YÖNETİMİ ───

export async function getTourBookings(tourId: string, startDate?: string, endDate?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("tour_bookings")
    .select("*")
    .eq("tour_id", tourId)
    .neq("status", "cancelled")
    .order("booking_date")
    .order("created_at");

  if (startDate) query = query.gte("booking_date", startDate);
  if (endDate) query = query.lte("booking_date", endDate);

  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

export async function createManualBooking(
  tourId: string,
  tenantId: string,
  bookingData: Record<string, any>
) {
  const supabase = await createClient();

  // Kapasite kontrolü
  const { data: tour } = await supabase
    .from("tours")
    .select("capacity, price_per_person, child_price, currency")
    .eq("id", tourId)
    .single();

  if (!tour) return { success: false, error: "Tur bulunamadı." };

  const { data: dateOverride } = await supabase
    .from("tour_date_overrides")
    .select("capacity_override, price_override")
    .eq("tour_id", tourId)
    .eq("date", bookingData.booking_date)
    .eq("is_active", true)
    .maybeSingle();

  const effectiveCapacity = dateOverride?.capacity_override || tour.capacity;
  const effectivePrice = dateOverride?.price_override || tour.price_per_person;

  const { data: existingBookings } = await supabase
    .from("tour_bookings")
    .select("adult_count, child_count")
    .eq("tour_id", tourId)
    .eq("booking_date", bookingData.booking_date)
    .neq("status", "cancelled");

  const booked = existingBookings?.reduce(
    (sum: number, b: any) => sum + (b.adult_count || 0) + (b.child_count || 0), 0
  ) || 0;

  const totalGuests = (bookingData.adult_count || 1) + (bookingData.child_count || 0);
  const remaining = effectiveCapacity - booked;

  if (remaining < totalGuests) {
    return {
      success: false,
      error: remaining <= 0
        ? "Bu tarihte yer kalmamıştır."
        : `Bu tarihte sadece ${remaining} kişilik yer var. ${totalGuests} kişi eklenemiyor.`,
    };
  }

  const adultTotal = (bookingData.adult_count || 1) * (effectivePrice || 0);
  const childTotal = (bookingData.child_count || 0) * (tour.child_price || 0);
  const totalPrice = adultTotal + childTotal + (bookingData.services_total || 0);

  const { data, error } = await supabase
    .from("tour_bookings")
    .insert({
      tour_id: tourId,
      tenant_id: tenantId,
      guest_name: bookingData.guest_name,
      guest_email: bookingData.guest_email || null,
      guest_phone: bookingData.guest_phone || null,
      booking_date: bookingData.booking_date,
      adult_count: bookingData.adult_count || 1,
      child_count: bookingData.child_count || 0,
      adult_unit_price: effectivePrice,
      child_unit_price: tour.child_price,
      services_total: bookingData.services_total || 0,
      total_price: totalPrice,
      selected_services: bookingData.selected_services || [],
      description: bookingData.description || null,
      internal_note: bookingData.internal_note || null,
      status: "confirmed",
      created_by_ai: false,
      is_reviewed: true,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/panel/tours");
  return { success: true, booking: data };
}

export async function updateBookingStatus(bookingId: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tour_bookings")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", bookingId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/panel/tours");
  return { success: true };
}

export async function reviewTourBooking(bookingId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tour_bookings")
    .update({ is_reviewed: true })
    .eq("id", bookingId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/panel/tours");
  return { success: true };
}

// ─── SIDEBAR İÇİN ───

export async function hasTenantTours(tenantId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("tours")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("is_active", true);
  return (count || 0) > 0;
}

export async function getUnreviewedTourBookingCount(tenantId: string): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("tour_bookings")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("is_reviewed", false);
  return count || 0;
}

// ─── REZERVASYON DÜZENLEME ───

export async function updateTourBooking(
  bookingId: string,
  bookingData: Record<string, any>
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tour_bookings")
    .update({
      guest_name: bookingData.guest_name,
      guest_email: bookingData.guest_email || null,
      guest_phone: bookingData.guest_phone || null,
      adult_count: bookingData.adult_count || 1,
      child_count: bookingData.child_count || 0,
      total_price: bookingData.total_price || null,
      description: bookingData.description || null,
      payment_status: bookingData.payment_status || "pending",
      payment_method: bookingData.payment_method || null,
      deposit_paid: bookingData.deposit_paid || false,
      deposit_amount_paid: bookingData.deposit_amount_paid || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/panel/tours");
  return { success: true, booking: data };
}

// ─── IBAN / BANKA HESABI YÖNETİMİ ───

export async function getTenantBankAccounts(tenantId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenant_bank_accounts")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("created_at");

  if (error) return [];
  return data || [];
}

export async function addBankAccount(
  tenantId: string,
  accountData: { bank_name: string; iban: string; account_holder?: string }
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenant_bank_accounts")
    .insert({
      tenant_id: tenantId,
      bank_name: accountData.bank_name,
      iban: accountData.iban,
      account_holder: accountData.account_holder || null,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/panel/tours");
  revalidatePath("/panel/settings");
  return { success: true, account: data };
}

export async function deleteBankAccount(accountId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tenant_bank_accounts")
    .update({ is_active: false })
    .eq("id", accountId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/panel/tours");
  revalidatePath("/panel/settings");
  return { success: true };
}

// ─── TUR KAPAK FOTOĞRAFI ───

const PHOTO_BUCKET = "resource-photos";
const MAX_SIZE_MB = 5;

export async function uploadTourCoverPhoto(
  tourId: string,
  tenantId: string,
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  const file = formData.get("file") as File | null;
  if (!file) return { success: false, error: "Dosya bulunamadı." };

  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return { success: false, error: `Dosya boyutu ${MAX_SIZE_MB}MB'dan büyük olamaz.` };
  }

  if (!file.type.startsWith("image/")) {
    return { success: false, error: "Sadece görsel dosyaları yüklenebilir." };
  }

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Oturum bulunamadı." };

  let ext = "jpg";
  if (file.type.includes("png")) ext = "png";
  else if (file.type.includes("webp")) ext = "webp";

  const filePath = `${tenantId}/tours/${tourId}/cover.${ext}`;
  const buffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    console.error("[Tour Cover Upload]", uploadError);
    return { success: false, error: uploadError.message };
  }

  const { data: { publicUrl } } = supabase.storage
    .from(PHOTO_BUCKET)
    .getPublicUrl(filePath);

  const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

  // tours tablosundaki cover_photo alanını güncelle
  const { error: updateError } = await supabase
    .from("tours")
    .update({ cover_photo: urlWithCacheBust, updated_at: new Date().toISOString() })
    .eq("id", tourId);

  if (updateError) {
    return { success: false, error: "Fotoğraf yüklendi ancak kayıt güncellenemedi." };
  }

  revalidatePath("/panel/tours");
  return { success: true, url: urlWithCacheBust };
}

export async function deleteTourCoverPhoto(
  tourId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const extensions = ["jpg", "png", "webp"];
  for (const ext of extensions) {
    await supabase.storage
      .from(PHOTO_BUCKET)
      .remove([`${tenantId}/tours/${tourId}/cover.${ext}`]);
  }

  const { error } = await supabase
    .from("tours")
    .update({ cover_photo: null, updated_at: new Date().toISOString() })
    .eq("id", tourId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/panel/tours");
  return { success: true };
}

// ─── AY BAZLI VERİ ÇEKME ───

export async function getTourMonthData(tourId: string, monthStart: string, monthEnd: string) {
  const supabase = await createClient();

  const [bookingsResult, overridesResult] = await Promise.all([
    supabase
      .from("tour_bookings")
      .select("*")
      .eq("tour_id", tourId)
      .gte("booking_date", monthStart)
      .lte("booking_date", monthEnd)
      .order("booking_date")
      .order("created_at"),
    supabase
      .from("tour_date_overrides")
      .select("*")
      .eq("tour_id", tourId)
      .gte("date", monthStart)
      .order("date"),
  ]);

  return {
    bookings: bookingsResult.data || [],
    overrides: overridesResult.data || [],
  };
}
