/**
 * AI Tool Handler'ları
 * Her tool çağrıldığında çalıştırılacak fonksiyonlar
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { sendAppointmentEmail } from "@/lib/ai/email-sender";
import { getTrendyolCredentials } from "@/app/actions/trendyol";
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
    return JSON.stringify({
      error: "Trendyol mağazası bağlı değil.",
    });
  }

  try {
    const result = await getShipmentPackages(creds, {
      orderNumber: args.order_number,
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
    return JSON.stringify({
      error: "Trendyol mağazası bağlı değil.",
    });
  }

  try {
    // Önce siparişi bul
    const result = await getShipmentPackages(creds, {
      orderNumber: args.order_number,
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
