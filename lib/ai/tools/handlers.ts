/**
 * AI Tool Handler'ları
 * Her tool çağrıldığında çalıştırılacak fonksiyonlar
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { sendAppointmentEmail } from "@/lib/ai/email-sender";
import { getTrendyolCredentials } from "@/lib/trendyol/credentials";
import {
  getShipmentPackages,
  createClaim,
} from "@/lib/trendyol/client";

interface ToolContext {
  tenantId: string;
  conversationId: string;
  senderPhone: string;
}

/**
 * Ortak müşteri bul/oluştur fonksiyonu.
 * Önce email, sonra telefon, sonra isim ile arar.
 * Bulamazsa yeni müşteri kartı oluşturur.
 */
export async function findOrCreateCustomer(
  supabase: any,
  tenantId: string,
  name: string,
  email?: string,
  phone?: string
): Promise<string | null> {
  try {
    // 1. Email ile ara
    if (email) {
      const { data: byEmail } = await supabase
        .from("customers")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("email", email)
        .limit(1)
        .maybeSingle();
      if (byEmail) {
        // Eksik bilgileri güncelle
        const updates: any = {};
        if (name) updates.full_name = name;
        if (phone) updates.phone = phone;
        if (Object.keys(updates).length > 0) {
          await supabase.from("customers").update(updates).eq("id", byEmail.id);
        }
        return byEmail.id;
      }
    }

    // 2. Telefon ile ara (normalize edip)
    if (phone) {
      const normalizedPhone = phone.replace(/[^0-9+]/g, "");
      const { data: byPhone } = await supabase
        .from("customers")
        .select("id, phone")
        .eq("tenant_id", tenantId)
        .not("phone", "is", null);

      if (byPhone) {
        const match = byPhone.find((c: any) => {
          const cp = (c.phone || "").replace(/[^0-9+]/g, "");
          return cp === normalizedPhone || cp.endsWith(normalizedPhone.slice(-10)) || normalizedPhone.endsWith(cp.slice(-10));
        });
        if (match) {
          // Eksik bilgileri güncelle
          const updates: any = {};
          if (name) updates.full_name = name;
          if (email) updates.email = email;
          if (Object.keys(updates).length > 0) {
            await supabase.from("customers").update(updates).eq("id", match.id);
          }
          return match.id;
        }
      }
    }

    // 3. İsim ile ara (exact match)
    if (name) {
      const { data: byName } = await supabase
        .from("customers")
        .select("id")
        .eq("tenant_id", tenantId)
        .ilike("full_name", name.trim())
        .limit(1)
        .maybeSingle();
      if (byName) {
        const updates: any = {};
        if (email) updates.email = email;
        if (phone) updates.phone = phone;
        if (Object.keys(updates).length > 0) {
          await supabase.from("customers").update(updates).eq("id", byName.id);
        }
        return byName.id;
      }
    }

    // 4. Bulunamadı → Yeni müşteri oluştur
    if (name) {
      const { data: newCustomer } = await supabase
        .from("customers")
        .insert({
          tenant_id: tenantId,
          full_name: name,
          email: email || null,
          phone: phone || null,
        })
        .select("id")
        .single();
      console.log(`[AI] Müşteri kartı oluşturuldu: ${name} (${newCustomer?.id})`);
      return newCustomer?.id || null;
    }

    return null;
  } catch (err) {
    console.error("[AI] Müşteri bul/oluştur hatası:", err);
    return null;
  }
}

/**
 * Tool adına göre doğru handler'ı çalıştırır
 */
export async function executeToolCall(
  toolName: string,
  args: Record<string, any>,
  context: ToolContext
): Promise<string> {
  try {
    switch (toolName) {
      case "check_availability":
        return await handleCheckAvailability(args, context);
      case "create_appointment":
        return await handleCreateAppointment(args, context);
      case "get_my_appointments":
        return await handleGetMyAppointments(args, context);
      case "cancel_appointment":
        return await handleCancelAppointment(args, context);
      case "reschedule_appointment":
        return await handleRescheduleAppointment(args, context);
      case "notify_human_agent":
        return await handleNotifyHumanAgent(args, context);
      case "update_customer":
        return await handleUpdateCustomer(args, context);
      case "mail_gonder":
        return await handleMailGonder(args, context);
      // ─── TRENDYOL TOOLS ───
      case "search_trendyol_products":
        return await handleSearchTrendyolProducts(args, context);
      case "check_trendyol_order":
        return await handleCheckTrendyolOrder(args, context);
      case "create_trendyol_return":
        return await handleCreateTrendyolReturn(args, context);
      // ─── TUR TOOLS ───
      case "list_available_tours":
        return await handleListAvailableTours(args, context);
      case "check_tour_availability":
        return await handleCheckTourAvailability(args, context);
      case "create_tour_booking":
        return await handleCreateTourBooking(args, context);
      case "cancel_tour_booking":
        return await handleCancelTourBooking(args, context);
      case "modify_tour_booking":
        return await handleModifyTourBooking(args, context);
      default:
        return JSON.stringify({ error: `Bilinmeyen tool: ${toolName}` });
    }
  } catch (error: any) {
    console.error(`[AI Tool] Error executing ${toolName}:`, error);
    return JSON.stringify({ error: error.message || "Tool çalıştırılırken hata oluştu" });
  }
}

async function handleCheckAvailability(
  args: Record<string, any>,
  context: ToolContext
): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("check_availability", {
    p_tenant_id: context.tenantId,
    p_date: args.date,
    p_employee_name: args.employee_name,
  });

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  if (!data || data.length === 0) {
    return JSON.stringify({
      message: "Bu tarihte müsait saat bulunamadı. Farklı bir tarih veya personel deneyin.",
      available_slots: [],
    });
  }

  return JSON.stringify({
    message: `${data.length} müsait saat bulundu`,
    available_slots: data,
  });
}

async function handleCreateAppointment(
  args: Record<string, any>,
  context: ToolContext
): Promise<string> {
  const supabase = createAdminClient();

  // Müşteri kartı bul/oluştur
  const customerId = await findOrCreateCustomer(
    supabase,
    context.tenantId,
    args.customer_name,
    args.customer_email,
    args.customer_phone
  );

  const { data, error } = await supabase.rpc("create_appointment", {
    p_tenant_id: context.tenantId,
    p_customer_name: args.customer_name,
    p_customer_email: args.customer_email,
    p_customer_phone: args.customer_phone,
    p_start_time: args.start_time,
    p_end_time: args.end_time,
    p_title: args.title,
    p_description: args.description || "",
    p_employee_name: args.employee_name,
  });

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  // Randevu verisine customer_id ekle
  if (customerId && data) {
    data.customer_id = customerId;
  }

  return JSON.stringify(data);
}

async function handleGetMyAppointments(
  args: Record<string, any>,
  context: ToolContext
): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_my_appointments", {
    p_identifier: args.customer_identifier,
    p_tenant_id: context.tenantId,
  });

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  if (!data || data.length === 0) {
    return JSON.stringify({
      message: "Gelecekte planlanmış randevu bulunamadı.",
      appointments: [],
    });
  }

  return JSON.stringify({
    message: `${data.length} randevu bulundu`,
    appointments: data,
  });
}

async function handleCancelAppointment(
  args: Record<string, any>,
  _context: ToolContext
): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("cancel_appointment", {
    p_appointment_id: args.appointment_id,
  });

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  return JSON.stringify(data);
}

async function handleRescheduleAppointment(
  args: Record<string, any>,
  _context: ToolContext
): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("reschedule_appointment", {
    p_appointment_id: args.appointment_id,
    p_new_start_time: args.new_start_time,
    p_new_end_time: args.new_end_time || null,
  });

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  return JSON.stringify(data);
}

async function handleNotifyHumanAgent(
  args: Record<string, any>,
  context: ToolContext
): Promise<string> {
  const supabase = createAdminClient();

  // Bildirim oluştur (conversation modunu DEĞİŞTİRME - işletme sahibi manuel devralacak)
  await supabase.from("notifications").insert({
    tenant_id: context.tenantId,
    type: "AI_ESCALATION",
    title: "\ud83d\udd14 Canlı Destek Talebi",
    message: args.summary,
    metadata: {
      conversation_id: context.conversationId,
      customer_number: context.senderPhone,
    },
  });

  return JSON.stringify({
    success: true,
    message: "Canlı destek talebi iletildi. Bir temsilci en kısa sürede size dönüş yapacaktır.",
  });
}

async function handleUpdateCustomer(
  args: Record<string, any>,
  context: ToolContext
): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("update_customer", {
    p_tenant_id: context.tenantId,
    p_customer_phone: args.customer_phone,
    p_field: args.field,
    p_value: args.value,
  });

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  return JSON.stringify(data);
}

async function handleMailGonder(
  args: Record<string, any>,
  context: ToolContext
): Promise<string> {
  try {
    await sendAppointmentEmail(context.tenantId, {
      type: args.type,
      customerName: args.customer_name,
      customerEmail: args.customer_email,
      appointmentTitle: args.appointment_title,
      appointmentDate: args.appointment_date,
      employeeName: args.employee_name || "",
    });

    return JSON.stringify({
      success: true,
      message: "E-posta başarıyla gönderildi.",
    });
  } catch (error: any) {
    console.error("[AI Tool] Mail gönderim hatası:", error);
    return JSON.stringify({
      success: false,
      message: "E-posta gönderilirken bir sorun oluştu: " + error.message,
    });
  }
}

// ─── TRENDYOL TOOL HANDLERS ───

async function handleSearchTrendyolProducts(
  args: Record<string, any>,
  context: ToolContext
): Promise<string> {
  const supabase = createAdminClient();

  // Trendyol bağlantısı kontrol
  const { data: conn } = await supabase
    .from("channel_connections")
    .select("status")
    .eq("tenant_id", context.tenantId)
    .eq("channel", "trendyol")
    .maybeSingle();

  if (!conn || conn.status !== "connected") {
    return JSON.stringify({
      error: "Trendyol mağazası bağlı değil. Lütfen işletme sahibine Trendyol entegrasyonu yapmasını bildirin.",
    });
  }

  // Full-text search + filtreler
  const query = args.query || "";
  const searchTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t: string) => t.length > 1)
    .join(" & ");

  let dbQuery = supabase
    .from("trendyol_products")
    .select("title, description, brand, category_name, sale_price, list_price, quantity, images, attributes, product_url")
    .eq("business_id", context.tenantId)
    .eq("is_active", true)
    .gt("quantity", 0);

  // Fiyat filtreleri
  if (args.max_price) {
    dbQuery = dbQuery.lte("sale_price", args.max_price);
  }
  if (args.min_price) {
    dbQuery = dbQuery.gte("sale_price", args.min_price);
  }

  // Kategori filtresi
  if (args.category) {
    dbQuery = dbQuery.ilike("category_name", `%${args.category}%`);
  }

  // Metin araması (title ve description'da)
  if (searchTerms) {
    dbQuery = dbQuery.or(
      `title.ilike.%${query}%,description.ilike.%${query}%,brand.ilike.%${query}%`
    );
  }

  const { data: products, error } = await dbQuery
    .order("sale_price", { ascending: true })
    .limit(5);

  if (error) {
    console.error("[Trendyol Tool] Search error:", error);
    return JSON.stringify({ error: "Ürün arama sırasında hata oluştu" });
  }

  if (!products || products.length === 0) {
    return JSON.stringify({
      message: "Aramanızla eşleşen ürün bulunamadı. Farklı anahtar kelimeler deneyin.",
      products: [],
    });
  }

  // Sonuçları AI'a dön
  const results = products.map((p: any) => ({
    title: p.title,
    brand: p.brand,
    category: p.category_name,
    sale_price: `₺${p.sale_price}`,
    list_price: p.list_price > p.sale_price ? `₺${p.list_price}` : null,
    discount:
      p.list_price > p.sale_price
        ? `%${Math.round(((p.list_price - p.sale_price) / p.list_price) * 100)} indirim`
        : null,
    stock: `${p.quantity} adet`,
    attributes: p.attributes,
    image: p.images?.[0] || null,
    trendyol_link: p.product_url,
  }));

  return JSON.stringify({
    message: `${results.length} ürün bulundu`,
    products: results,
  });
}

async function handleCheckTrendyolOrder(
  args: Record<string, any>,
  context: ToolContext
): Promise<string> {
  const creds = await getTrendyolCredentials(context.tenantId);
  if (!creds) {
    console.error("[Trendyol Tool] No credentials for tenant:", context.tenantId);
    return JSON.stringify({
      error: "Trendyol mağazası bağlı değil veya API bilgileri eksik.",
    });
  }

  // Sipariş numarasını temizle (#, boşluk, tire kaldır)
  const rawOrderNumber = String(args.order_number || "").trim();
  const orderNumber = rawOrderNumber.replace(/^#/, "").replace(/[\s-]/g, "");

  if (!orderNumber) {
    return JSON.stringify({
      error: "Sipariş numarası belirtilmedi.",
    });
  }

  try {
    const result = await getShipmentPackages(creds, {
      orderNumber,
    });

    if (!result.content || result.content.length === 0) {
      return JSON.stringify({
        message: `"${args.order_number}" numaralı sipariş bulunamadı. Sipariş numarasını kontrol edin.`,
        order: null,
      });
    }

    const order = result.content[0];
    const statusMap: Record<string, string> = {
      Created: "Oluşturuldu",
      Picking: "Hazırlanıyor",
      Shipped: "Kargoya Verildi",
      Delivered: "Teslim Edildi",
      Cancelled: "İptal Edildi",
      Returned: "İade Edildi",
      UnDelivered: "Teslim Edilemedi",
    };

    return JSON.stringify({
      message: "Sipariş bulundu",
      order: {
        order_number: order.orderNumber,
        status: statusMap[order.status] || order.status,
        total_price: `₺${order.totalPrice}`,
        cargo_provider: order.cargoProviderName || "Belirtilmemiş",
        tracking_number: order.cargoTrackingNumber || "Henüz atanmadı",
        tracking_link: order.cargoTrackingLink || null,
        products: (order.lines || []).map((l) => ({
          name: l.productName,
          quantity: l.quantity,
          price: `₺${l.amount}`,
        })),
        estimated_delivery: order.estimatedDeliveryEndDate
          ? new Date(order.estimatedDeliveryEndDate).toLocaleDateString("tr-TR")
          : "Henüz belirlenmedi",
      },
    });
  } catch (error: any) {
    console.error("[Trendyol Tool] Order check error:", error);
    return JSON.stringify({
      error: "Sipariş sorgulanırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
    });
  }
}

async function handleCreateTrendyolReturn(
  args: Record<string, any>,
  context: ToolContext
): Promise<string> {
  const creds = await getTrendyolCredentials(context.tenantId);
  if (!creds) {
    console.error("[Trendyol Tool] No credentials for return, tenant:", context.tenantId);
    return JSON.stringify({
      error: "Trendyol mağazası bağlı değil veya API bilgileri eksik.",
    });
  }

  // Sipariş numarasını temizle
  const orderNumber = String(args.order_number || "").trim().replace(/^#/, "").replace(/[\s-]/g, "");

  try {
    // Önce siparişi bul
    const result = await getShipmentPackages(creds, {
      orderNumber,
    });

    if (!result.content || result.content.length === 0) {
      return JSON.stringify({
        error: `"${args.order_number}" numaralı sipariş bulunamadı.`,
      });
    }

    const order = result.content[0];

    // İade talebi oluştur
    const claimResult = await createClaim(creds, {
      shipmentPackageId: order.shipmentPackageId,
      items: (order.lines || []).map((l: any) => ({
        orderLineId: l.id,
        quantity: l.quantity,
      })),
      reason: args.reason,
    });

    return JSON.stringify({
      success: true,
      message: "İade talebi başarıyla oluşturuldu.",
      return_info: {
        order_number: args.order_number,
        reason: args.reason,
        status: "İade talebi oluşturuldu, onay bekleniyor.",
        note: "Ürünü kargoya verdikten sonra takip numarasını bizimle paylaşabilirsiniz.",
      },
    });
  } catch (error: any) {
    console.error("[Trendyol Tool] Return creation error:", error);
    return JSON.stringify({
      error: "İade talebi oluşturulurken bir hata oluştu: " + error.message,
    });
  }
}

// ─── TUR TOOL HANDLERS ───

const DAY_MAP: Record<number, string> = {
  0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat",
};

/** Belirli bir tarihin tur aktifliğini kontrol eder */
async function isTourActiveOnDate(
  supabase: any,
  tourId: string,
  date: string,
  availableDays: string[]
): Promise<{ active: boolean; reason?: string }> {
  // 1. Override kontrolü (spesifik tarih)
  const { data: override } = await supabase
    .from("tour_date_overrides")
    .select("is_active, note")
    .eq("tour_id", tourId)
    .eq("date", date)
    .maybeSingle();

  if (override) {
    return {
      active: override.is_active,
      reason: override.is_active ? undefined : (override.note || "Bu tarih için tur iptal edilmiş."),
    };
  }

  // 2. Varsayılan haftalık takvim kontrolü
  const dayOfWeek = new Date(date + "T12:00:00").getDay();
  const dayKey = DAY_MAP[dayOfWeek];

  if (!availableDays || !availableDays.includes(dayKey)) {
    return { active: false, reason: "Bu gün tur programında yok." };
  }

  return { active: true };
}

async function handleListAvailableTours(
  args: Record<string, any>,
  context: ToolContext
): Promise<string> {
  const supabase = createAdminClient();

  const { data: tours, error } = await supabase
    .from("tours")
    .select(`
      id, name, tour_type, description, capacity,
      price_per_person, child_price, child_age_limit,
      departure_time, return_time, route, departure_point, destination,
      vehicle_type, category, available_days, currency,
      cover_photo, gallery_url,
      accepts_credit_card, accepts_cash, accepts_bank_transfer,
      requires_deposit, deposit_amount, payment_terms,
      tour_service_options(name, price, is_included, is_per_person, is_active)
    `)
    .eq("tenant_id", context.tenantId)
    .eq("is_active", true)
    .order("sort_order");

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  if (!tours || tours.length === 0) {
    return JSON.stringify({
      message: "Şu anda aktif tur bulunmamaktadır.",
      tours: [],
    });
  }

  // Tarih filtresi varsa aktiflik kontrolü yap
  let filteredTours = tours;
  if (args.date) {
    const activeChecks = await Promise.all(
      tours.map(async (t: any) => {
        const check = await isTourActiveOnDate(supabase, t.id, args.date, t.available_days || []);
        return { tour: t, active: check.active };
      })
    );
    filteredTours = activeChecks.filter((c) => c.active).map((c) => c.tour);

    if (filteredTours.length === 0) {
      return JSON.stringify({
        message: `${args.date} tarihinde aktif tur bulunmamaktadır. Farklı bir tarih deneyin.`,
        tours: [],
      });
    }
  }

  const results = filteredTours.map((t: any) => {
    const services = (t.tour_service_options || []).filter((s: any) => s.is_active);
    const included = services.filter((s: any) => s.is_included).map((s: any) => s.name);
    const optional = services.filter((s: any) => !s.is_included).map((s: any) =>
      `${s.name} (+${s.price} ${t.currency || "TL"}${s.is_per_person ? "/ki\u015fi" : ""})`
    );

    const paymentMethods: string[] = [];
    if (t.accepts_credit_card) paymentMethods.push("Kredi Kart\u0131");
    if (t.accepts_cash) paymentMethods.push("Nakit");
    if (t.accepts_bank_transfer) paymentMethods.push("Banka Havalesi");

    return {
      name: t.name,
      type: t.tour_type,
      description: t.description,
      route: t.route,
      departure_point: t.departure_point,
      departure_time: t.departure_time,
      return_time: t.return_time,
      price_per_person: t.price_per_person ? `${t.price_per_person} ${t.currency || "TL"}` : null,
      child_price: t.child_price != null ? `${t.child_price} ${t.currency || "TL"} (0-${t.child_age_limit || 12} ya\u015f)` : null,
      vehicle_type: t.vehicle_type,
      included_services: included,
      optional_services: optional,
      cover_photo: t.cover_photo || null,
      gallery_url: t.gallery_url || null,
      payment_methods: paymentMethods.length > 0 ? paymentMethods : null,
      requires_deposit: t.requires_deposit || false,
      deposit_amount: t.deposit_amount ? `${t.deposit_amount} ${t.currency || "TL"}` : null,
      payment_terms: t.payment_terms || null,
    };
  });

  return JSON.stringify({
    message: `${results.length} aktif tur bulundu`,
    tours: results,
  });
}

async function handleCheckTourAvailability(
  args: Record<string, any>,
  context: ToolContext
): Promise<string> {
  const supabase = createAdminClient();

  // 1. Turu bul (isim ile fuzzy match)
  const { data: tours } = await supabase
    .from("tours")
    .select("id, name, capacity, price_per_person, child_price, child_age_limit, departure_time, return_time, route, available_days, season_start, season_end")
    .eq("tenant_id", context.tenantId)
    .eq("is_active", true)
    .ilike("name", `%${args.tour_name}%`)
    .limit(3);

  if (!tours || tours.length === 0) {
    return JSON.stringify({
      available: false,
      message: `"${args.tour_name}" adında aktif bir tur bulunamadı.`,
    });
  }

  const tour = tours[0];
  const guestCount = args.guest_count || 1;

  // 2. Sezon kontrolü
  if (tour.season_start && tour.season_end) {
    const checkDate = new Date(args.date);
    const seasonStart = new Date(tour.season_start);
    const seasonEnd = new Date(tour.season_end);
    if (checkDate < seasonStart || checkDate > seasonEnd) {
      return JSON.stringify({
        available: false,
        tour_name: tour.name,
        message: `${tour.name} bu tarihte sezon dışıdır. Sezon: ${tour.season_start} — ${tour.season_end}`,
      });
    }
  }

  // 3. Tarih aktiflik kontrolü (available_days + override)
  const activeCheck = await isTourActiveOnDate(supabase, tour.id, args.date, tour.available_days || []);
  if (!activeCheck.active) {
    return JSON.stringify({
      available: false,
      tour_name: tour.name,
      message: `${tour.name} bu tarihte aktif değil. ${activeCheck.reason || ""} Farklı bir tarih deneyin.`,
    });
  }

  // 4. Kapasite override kontrolü
  const { data: dateOverride } = await supabase
    .from("tour_date_overrides")
    .select("capacity_override, price_override")
    .eq("tour_id", tour.id)
    .eq("date", args.date)
    .eq("is_active", true)
    .maybeSingle();

  const effectiveCapacity = dateOverride?.capacity_override || tour.capacity;

  // 5. O gün toplam rezerve kişi sayısını hesapla
  const { data: bookings } = await supabase
    .from("tour_bookings")
    .select("adult_count, child_count")
    .eq("tour_id", tour.id)
    .eq("booking_date", args.date)
    .neq("status", "cancelled");

  const booked = bookings?.reduce((sum: number, b: any) => sum + (b.adult_count || 0) + (b.child_count || 0), 0) || 0;
  const remaining = effectiveCapacity - booked;

  // Müşteriye kalan koltuk sayısı SÖYLENME!
  // Sadece: yer var / yetersiz bilgisi döndür
  if (remaining < guestCount) {
    // Yetersiz kapasite — sadece kalan kadar yer var bilgisi ver
    if (remaining <= 0) {
      return JSON.stringify({
        available: false,
        tour_name: tour.name,
        date: args.date,
        message: `Maalesef ${args.date} tarihinde ${tour.name} için yerimiz dolmuştur. Farklı bir tarih için kontrol edebilirim.`,
      });
    } else {
      return JSON.stringify({
        available: false,
        tour_name: tour.name,
        date: args.date,
        remaining_spots: remaining,
        requested: guestCount,
        message: `Maalesef ${args.date} tarihinde ${guestCount} kişilik yer bulunmamaktadır. Sadece ${remaining} kişilik yerimiz mevcut. Dilerseniz başka bir tarih için kontrol edebilirim.`,
      });
    }
  }

  return JSON.stringify({
    available: true,
    tour_name: tour.name,
    date: args.date,
    message: `${args.date} tarihinde ${tour.name} için yerimiz mevcuttur.`,
    price_per_person: dateOverride?.price_override || tour.price_per_person,
    child_price: tour.child_price,
    child_age_limit: tour.child_age_limit,
    departure_time: tour.departure_time,
    return_time: tour.return_time,
    route: tour.route,
  });
}

async function handleCreateTourBooking(
  args: Record<string, any>,
  context: ToolContext
): Promise<string> {
  const supabase = createAdminClient();

  // 1. Turu bul
  const { data: tours } = await supabase
    .from("tours")
    .select("id, name, capacity, price_per_person, child_price, child_age_limit, available_days, currency, accepts_credit_card, accepts_cash, accepts_bank_transfer, requires_deposit, deposit_amount, payment_terms, selected_iban_ids, gallery_url, cover_photo, departure_time, return_time, departure_point, route, vehicle_type")
    .eq("tenant_id", context.tenantId)
    .eq("is_active", true)
    .ilike("name", `%${args.tour_name}%`)
    .limit(1);

  if (!tours || tours.length === 0) {
    return JSON.stringify({ success: false, error: `"${args.tour_name}" adında tur bulunamadı.` });
  }

  const tour = tours[0];
  const adultCount = args.adult_count || 1;
  const childCount = args.child_count || 0;
  const totalGuests = adultCount + childCount;

  // 2. Tarih aktiflik kontrolü
  const activeCheck = await isTourActiveOnDate(supabase, tour.id, args.date, tour.available_days || []);
  if (!activeCheck.active) {
    return JSON.stringify({ success: false, error: `${tour.name} bu tarihte aktif değil. ${activeCheck.reason || ""}` });
  }

  // 3. Kapasite kontrolü (son kontrol — race condition koruması)
  const { data: dateOverride } = await supabase
    .from("tour_date_overrides")
    .select("capacity_override, price_override")
    .eq("tour_id", tour.id)
    .eq("date", args.date)
    .eq("is_active", true)
    .maybeSingle();

  const effectiveCapacity = dateOverride?.capacity_override || tour.capacity;
  const effectivePrice = dateOverride?.price_override || tour.price_per_person;

  const { data: existingBookings } = await supabase
    .from("tour_bookings")
    .select("adult_count, child_count")
    .eq("tour_id", tour.id)
    .eq("booking_date", args.date)
    .neq("status", "cancelled");

  const booked = existingBookings?.reduce((sum: number, b: any) => sum + (b.adult_count || 0) + (b.child_count || 0), 0) || 0;
  const remaining = effectiveCapacity - booked;

  if (remaining < totalGuests) {
    return JSON.stringify({
      success: false,
      error: remaining <= 0
        ? `Bu tarihte yer kalmamıştır.`
        : `Bu tarihte ${totalGuests} kişilik yer bulunmamaktadır. Sadece ${remaining} kişilik yerimiz mevcut.`,
    });
  }

  // 4. Hizmet seçeneklerini eşleştir
  let servicesTotal = 0;
  const selectedServicesData: any[] = [];

  if (args.selected_services?.length) {
    const { data: availableServices } = await supabase
      .from("tour_service_options")
      .select("id, name, price, is_per_person, is_included")
      .eq("tour_id", tour.id)
      .eq("is_active", true);

    for (const serviceName of args.selected_services) {
      const svc = availableServices?.find((s: any) =>
        s.name.toLowerCase().includes(serviceName.toLowerCase()) ||
        serviceName.toLowerCase().includes(s.name.toLowerCase())
      );
      if (svc && !svc.is_included) {
        const qty = svc.is_per_person ? totalGuests : 1;
        const cost = svc.price * qty;
        servicesTotal += cost;
        selectedServicesData.push({
          name: svc.name,
          price: svc.price,
          qty,
          total: cost,
        });
      }
    }
  }

  // 5. Fiyat hesapla
  const adultTotal = adultCount * (effectivePrice || 0);
  const childTotal = childCount * (tour.child_price || 0);
  const totalPrice = adultTotal + childTotal + servicesTotal;

  // 6. Müşteri bul/oluştur
  const customerId = await findOrCreateCustomer(
    supabase,
    context.tenantId,
    args.customer_name,
    args.customer_email,
    args.customer_phone
  );

  // 7. Rezervasyon oluştur
  const { data: booking, error } = await supabase
    .from("tour_bookings")
    .insert({
      tour_id: tour.id,
      tenant_id: context.tenantId,
      customer_id: customerId,
      guest_name: args.customer_name,
      guest_email: args.customer_email,
      guest_phone: args.customer_phone,
      booking_date: args.date,
      adult_count: adultCount,
      child_count: childCount,
      adult_unit_price: effectivePrice,
      child_unit_price: tour.child_price,
      services_total: servicesTotal,
      total_price: totalPrice,
      selected_services: selectedServicesData,
      description: args.description ? `${args.description} (AI Tarafından Oluşturuldu)` : "(AI Tarafından Oluşturuldu)",
      status: "pending_approval",
      created_by_ai: true,
      is_reviewed: false,
    })
    .select("id")
    .single();

  if (error) {
    return JSON.stringify({ success: false, error: error.message });
  }

  // Fiyat özeti oluştur
  const currency = tour.currency || "TL";
  const priceBreakdown: string[] = [];
  priceBreakdown.push(`${adultCount} yetişkin × ${effectivePrice} ${currency} = ${adultTotal} ${currency}`);
  if (childCount > 0) {
    priceBreakdown.push(`${childCount} çocuk × ${tour.child_price} ${currency} = ${childTotal} ${currency}`);
  }
  if (servicesTotal > 0) {
    for (const svc of selectedServicesData) {
      priceBreakdown.push(`${svc.name}: ${svc.total} ${currency}`);
    }
  }
  priceBreakdown.push(`Toplam: ${totalPrice} ${currency}`);

  // Ödeme bilgisi
  const paymentMethods: string[] = [];
  if (tour.accepts_credit_card) paymentMethods.push("Kredi Kartı");
  if (tour.accepts_cash) paymentMethods.push("Nakit");
  if (tour.accepts_bank_transfer) paymentMethods.push("Banka Havalesi");

  // IBAN bilgileri
  let ibanInfo: string[] = [];
  if (tour.accepts_bank_transfer && tour.selected_iban_ids?.length > 0) {
    const { data: bankAccounts } = await supabase
      .from("tenant_bank_accounts")
      .select("bank_name, iban, account_holder")
      .in("id", tour.selected_iban_ids)
      .eq("is_active", true);
    if (bankAccounts) {
      ibanInfo = bankAccounts.map((a: any) => `${a.bank_name}: ${a.iban}${a.account_holder ? ` (${a.account_holder})` : ""}`);
    }
  }

  // 📧 Otomatik e-posta gönder (rezervasyon alındı)
  try {
    const { sendTourBookingEmail } = await import("@/lib/ai/tour-email-sender");
    await sendTourBookingEmail(context.tenantId, {
      type: "booking_created",
      guestName: args.customer_name,
      guestEmail: args.customer_email,
      guestPhone: args.customer_phone,
      tourName: tour.name,
      bookingDate: args.date,
      adultCount: adultCount,
      childCount: childCount,
      totalPrice: totalPrice,
      currency: currency,
      departureTime: tour.departure_time || undefined,
      returnTime: tour.return_time || undefined,
      departurePoint: tour.departure_point || undefined,
      route: tour.route || undefined,
      vehicleType: tour.vehicle_type || undefined,
      depositAmount: tour.deposit_amount || undefined,
      depositRequired: tour.requires_deposit || false,
      paymentMethods: paymentMethods.length > 0 ? paymentMethods : undefined,
      ibanInfo: ibanInfo.length > 0 ? ibanInfo : undefined,
      paymentTerms: tour.payment_terms || undefined,
      selectedServices: selectedServicesData.length > 0 ? selectedServicesData : undefined,
      description: args.description || undefined,
    });
  } catch (emailErr: any) {
    console.error("[AI Tour] Email sending failed:", emailErr.message);
    // Don't fail the booking if email fails
  }

  return JSON.stringify({
    success: true,
    booking_id: booking?.id,
    tour_name: tour.name,
    date: args.date,
    adult_count: adultCount,
    child_count: childCount,
    total_guests: totalGuests,
    price_breakdown: priceBreakdown,
    total_price: `${totalPrice} ${currency}`,
    status: "pending_approval",
    payment_methods: paymentMethods.length > 0 ? paymentMethods : ["Belirtilmemiş"],
    requires_deposit: tour.requires_deposit || false,
    deposit_amount: tour.deposit_amount ? `${tour.deposit_amount} ${currency}` : null,
    payment_terms: tour.payment_terms || null,
    iban_info: ibanInfo.length > 0 ? ibanInfo : null,
    gallery_url: tour.gallery_url || null,
    cover_photo: tour.cover_photo || null,
    message: `✅ Rezervasyon oluşturuldu! ${tour.name}, ${args.date} tarihinde ${totalGuests} kişi. Toplam: ${totalPrice} ${currency}. ℹ️ Rezervasyonunuz işletme onayı beklemektedir. Kısa süre içinde onay bilgisi iletilecektir.`,
  });
}

// ─── TUR REZERVASYON İPTAL ───

async function handleCancelTourBooking(
  args: Record<string, any>,
  context: ToolContext
): Promise<string> {
  const supabase = createAdminClient();

  // Önce müşteri kartından bulmaya çalış, bulamazsa isim ile ara
  let bookings: any[] | null = null;

  // 1. Müşteri kartı ile ara
  const customerId = await findOrCreateCustomer(
    supabase, context.tenantId, args.customer_name, undefined, context.senderPhone
  );
  if (customerId) {
    const { data } = await supabase
      .from("tour_bookings")
      .select("id, guest_name, guest_email, guest_phone, booking_date, adult_count, child_count, total_price, status, tour_id")
      .eq("tenant_id", context.tenantId)
      .eq("booking_date", args.date)
      .eq("customer_id", customerId)
      .neq("status", "cancelled")
      .limit(1);
    bookings = data;
  }

  // 2. Bulunamadıysa isim ile ara (fallback)
  if (!bookings || bookings.length === 0) {
    const { data } = await supabase
      .from("tour_bookings")
      .select("id, guest_name, guest_email, guest_phone, booking_date, adult_count, child_count, total_price, status, tour_id")
      .eq("tenant_id", context.tenantId)
      .eq("booking_date", args.date)
      .ilike("guest_name", `%${args.customer_name}%`)
      .neq("status", "cancelled")
      .limit(1);
    bookings = data;
  }

  if (!bookings || bookings.length === 0) {
    return JSON.stringify({
      success: false,
      error: `${args.customer_name} adına ${args.date} tarihinde aktif bir tur rezervasyonu bulunamadı.`,
    });
  }

  const booking = bookings[0];

  // İptal et
  const { error } = await supabase
    .from("tour_bookings")
    .update({ status: "cancelled" })
    .eq("id", booking.id);

  if (error) {
    return JSON.stringify({ success: false, error: error.message });
  }

  // 📧 İptal e-postası gönder
  if (booking.guest_email) {
    try {
      const { sendTourBookingEmail } = await import("@/lib/ai/tour-email-sender");
      const { data: tour } = await supabase
        .from("tours")
        .select("name, currency, departure_time, return_time, departure_point, route")
        .eq("id", booking.tour_id)
        .single();

      await sendTourBookingEmail(context.tenantId, {
        type: "booking_cancelled",
        guestName: booking.guest_name,
        guestEmail: booking.guest_email,
        guestPhone: booking.guest_phone || undefined,
        tourName: tour?.name || "Tur",
        bookingDate: booking.booking_date,
        adultCount: booking.adult_count,
        childCount: booking.child_count,
        totalPrice: booking.total_price || undefined,
        currency: tour?.currency || "TL",
        departureTime: tour?.departure_time || undefined,
        returnTime: tour?.return_time || undefined,
        departurePoint: tour?.departure_point || undefined,
        route: tour?.route || undefined,
      });
    } catch (emailErr: any) {
      console.error("[AI Tour] Cancel email failed:", emailErr.message);
    }
  }

  return JSON.stringify({
    success: true,
    booking_id: booking.id,
    guest_name: booking.guest_name,
    date: booking.booking_date,
    message: `❌ ${booking.guest_name} adına ${booking.booking_date} tarihli tur rezervasyonu başarıyla iptal edildi.`,
  });
}

// ─── TUR REZERVASYON DEĞİŞİKLİK ───

async function handleModifyTourBooking(
  args: Record<string, any>,
  context: ToolContext
): Promise<string> {
  const supabase = createAdminClient();

  // Önce müşteri kartından bulmaya çalış, bulamazsa isim ile ara
  let bookings: any[] | null = null;

  // 1. Müşteri kartı ile ara
  const customerId = await findOrCreateCustomer(
    supabase, context.tenantId, args.customer_name, undefined, context.senderPhone
  );
  if (customerId) {
    const { data } = await supabase
      .from("tour_bookings")
      .select("id, guest_name, guest_email, guest_phone, booking_date, adult_count, child_count, total_price, description, status, tour_id")
      .eq("tenant_id", context.tenantId)
      .eq("booking_date", args.date)
      .eq("customer_id", customerId)
      .neq("status", "cancelled")
      .limit(1);
    bookings = data;
  }

  // 2. Bulunamadıysa isim ile ara (fallback)
  if (!bookings || bookings.length === 0) {
    const { data } = await supabase
      .from("tour_bookings")
      .select("id, guest_name, guest_email, guest_phone, booking_date, adult_count, child_count, total_price, description, status, tour_id")
      .eq("tenant_id", context.tenantId)
      .eq("booking_date", args.date)
      .ilike("guest_name", `%${args.customer_name}%`)
      .neq("status", "cancelled")
      .limit(1);
    bookings = data;
  }

  if (!bookings || bookings.length === 0) {
    return JSON.stringify({
      success: false,
      error: `${args.customer_name} adına ${args.date} tarihinde aktif bir tur rezervasyonu bulunamadı.`,
    });
  }

  const booking = bookings[0];

  // Kapasite kontrolü (eğer kişi sayısı artıyorsa)
  const newAdult = args.new_adult_count ?? booking.adult_count;
  const newChild = args.new_child_count ?? booking.child_count;
  const newTotal = newAdult + newChild;
  const oldTotal = booking.adult_count + booking.child_count;

  if (newTotal > oldTotal) {
    // Ek kapasite kontrolü
    const { data: tour } = await supabase
      .from("tours")
      .select("capacity")
      .eq("id", booking.tour_id)
      .single();

    if (tour) {
      const { data: dayBookings } = await supabase
        .from("tour_bookings")
        .select("adult_count, child_count")
        .eq("tour_id", booking.tour_id)
        .eq("booking_date", args.date)
        .neq("status", "cancelled")
        .neq("id", booking.id);

      const currentBooked = dayBookings?.reduce((sum: number, b: any) => sum + (b.adult_count || 0) + (b.child_count || 0), 0) || 0;
      const remaining = tour.capacity - currentBooked;

      if (newTotal > remaining) {
        return JSON.stringify({
          success: false,
          error: `Kapasite yetersiz. Mevcut boş yer: ${remaining} kişi, istenen: ${newTotal} kişi.`,
        });
      }
    }
  }

  // Fiyat yeniden hesapla
  let newTotalPrice = booking.total_price;
  if (args.new_adult_count !== undefined || args.new_child_count !== undefined) {
    const { data: tour } = await supabase
      .from("tours")
      .select("price_per_person, child_price, currency")
      .eq("id", booking.tour_id)
      .single();

    if (tour?.price_per_person) {
      newTotalPrice = (newAdult * (tour.price_per_person || 0)) + (newChild * (tour.child_price || 0));
    }
  }

  // Güncelle
  const updates: any = {
    adult_count: newAdult,
    child_count: newChild,
    total_price: newTotalPrice,
  };
  if (args.new_description !== undefined) {
    updates.description = args.new_description;
  }

  const { error } = await supabase
    .from("tour_bookings")
    .update(updates)
    .eq("id", booking.id);

  if (error) {
    return JSON.stringify({ success: false, error: error.message });
  }

  // 📧 Değişiklik e-postası gönder
  if (booking.guest_email) {
    try {
      const { sendTourBookingEmail } = await import("@/lib/ai/tour-email-sender");
      const { data: tourInfo } = await supabase
        .from("tours")
        .select("name, currency, departure_time, return_time, departure_point, route")
        .eq("id", booking.tour_id)
        .single();

      await sendTourBookingEmail(context.tenantId, {
        type: "booking_modified",
        guestName: booking.guest_name,
        guestEmail: booking.guest_email,
        guestPhone: booking.guest_phone || undefined,
        tourName: tourInfo?.name || "Tur",
        bookingDate: booking.booking_date,
        adultCount: newAdult,
        childCount: newChild,
        totalPrice: newTotalPrice || undefined,
        currency: tourInfo?.currency || "TL",
        departureTime: tourInfo?.departure_time || undefined,
        returnTime: tourInfo?.return_time || undefined,
        departurePoint: tourInfo?.departure_point || undefined,
        route: tourInfo?.route || undefined,
        oldAdultCount: booking.adult_count,
        oldChildCount: booking.child_count,
        oldTotalPrice: booking.total_price || undefined,
      });
    } catch (emailErr: any) {
      console.error("[AI Tour] Modify email failed:", emailErr.message);
    }
  }

  return JSON.stringify({
    success: true,
    booking_id: booking.id,
    guest_name: booking.guest_name,
    date: booking.booking_date,
    old_guests: `${booking.adult_count}Y + ${booking.child_count}Ç`,
    new_guests: `${newAdult}Y + ${newChild}Ç`,
    new_total_price: newTotalPrice,
    message: `✅ ${booking.guest_name} adına ${booking.booking_date} tarihli rezervasyon güncellendi. Kişi sayısı: ${newAdult} yetişkin + ${newChild} çocuk. ${newTotalPrice ? `Yeni toplam: ${newTotalPrice} TL` : ""}`,
  });
}
