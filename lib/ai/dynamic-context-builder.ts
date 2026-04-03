/**
 * Dinamik Kaynak & Tur Bağlam Oluşturucu
 * AI Agent her mesaj işlediğinde çağrılır.
 * Güncel kaynakları ve turları DB'den çekip sistem mesajına enjekte eder.
 * Böylece kaynak/tur değişikliği → otomatik olarak AI'a yansır.
 */

import { formatResourceAttributes } from "@/lib/resource-types";

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  employee: "Personel",
  room: "Oda",
  boat: "Tekne",
  vehicle: "Araç",
  table: "Masa",
  villa: "Villa / Apart",
  studio: "Stüdyo",
};

const DAY_LABELS: Record<string, string> = {
  mon: "Pazartesi",
  tue: "Salı",
  wed: "Çarşamba",
  thu: "Perşembe",
  fri: "Cuma",
  sat: "Cumartesi",
  sun: "Pazar",
};

/**
 * Runtime'da kaynakları ve turları çekip sistem mesajına enjekte eder.
 * Her mesaj işlendiğinde çağrılır — DB sorguları hafif ve indeksli.
 */
export async function buildDynamicResourceContext(
  supabase: any,
  tenantId: string
): Promise<string> {
  const sections: string[] = [];

  // 1. Kayıtlı kaynakları çek (tenant_employees)
  const { data: resources } = await supabase
    .from("tenant_employees")
    .select("name, title, resource_type, attributes, extra_info")
    .eq("tenant_id", tenantId)
    .order("name");

  if (resources?.length) {
    sections.push(buildResourceSection(resources));
  }

  // 2. Aktif turları + hizmet seçeneklerini çek
  const { data: tours } = await supabase
    .from("tours")
    .select(`
      id, name, tour_type, description, capacity,
      price_per_person, child_price, child_age_limit,
      departure_time, return_time, duration_hours, duration_days,
      route, departure_point, destination,
      vehicle_type, category, available_days,
      season_start, season_end,
      extra_info, cancellation_policy, what_to_bring,
      cover_photo, gallery_url,
      accepts_credit_card, accepts_cash, accepts_bank_transfer,
      requires_deposit, deposit_amount, payment_terms,
      selected_iban_ids, currency,
      tour_service_options(name, price, is_included, is_per_person, is_active)
    `)
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("sort_order");

  if (tours?.length) {
    // 3. Bugünün tarih override'larını da çek (aktif/pasif bilgisi)
    const tourIds = tours.map((t: any) => t.id);
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });

    const { data: overrides } = await supabase
      .from("tour_date_overrides")
      .select("tour_id, date, is_active, capacity_override, price_override, note")
      .in("tour_id", tourIds)
      .gte("date", today)
      .order("date")
      .limit(100);

    sections.push(buildTourSection(tours, overrides || []));
  }

  if (!sections.length) return "";

  return "\n\n" + sections.join("\n\n");
}

function buildResourceSection(resources: any[]): string {
  // Kaynakları tipe göre grupla
  const groups: Record<string, any[]> = {};
  for (const r of resources) {
    const type = r.resource_type || "employee";
    if (!groups[type]) groups[type] = [];
    groups[type].push(r);
  }

  const lines = ["[DİNAMİK KAYNAK BİLGİLERİ - Bu bölüm her zaman günceldir. Müşteriye bu kaynakları önerirken detaylı bilgi ver.]"];
  for (const [type, items] of Object.entries(groups)) {
    const label = RESOURCE_TYPE_LABELS[type] || type;
    lines.push(`\n### ${label}ler:`);
    for (const r of items) {
      const attrs = formatResourceAttributes(r);
      const title = r.title ? ` (${r.title})` : "";
      const extra = r.extra_info ? ` — ${r.extra_info}` : "";
      const photo = r.attributes?.cover_photo ? " | 📸 Kapak fotoğrafı mevcut" : "";
      const url = r.attributes?.detail_url ? ` | 🔗 ${r.attributes.detail_url}` : "";
      lines.push(`- ${r.name}${title}${attrs ? ": " + attrs : ""}${extra}${photo}${url}`);
    }
  }
  return lines.join("\n");
}

function buildTourSection(tours: any[], overrides: any[]): string {
  // Override'ları tour_id'ye göre grupla
  const overrideMap: Record<string, any[]> = {};
  for (const ov of overrides) {
    if (!overrideMap[ov.tour_id]) overrideMap[ov.tour_id] = [];
    overrideMap[ov.tour_id].push(ov);
  }

  const lines = [
    "[DİNAMİK TUR BİLGİLERİ - Bu bölüm her zaman günceldir]",
    "Aşağıdaki turlar aktif olarak sunulmaktadır. Müşteriye tur bilgisi verirken bu listeyi kullan.",
    "Tur rezervasyonu oluşturmadan ÖNCE mutlaka check_tour_availability tool'u ile kapasite kontrol et.",
    "ASLA müşteriye kalan koltuk sayısını söyleme. Sadece 'yerimiz mevcut' veya 'maalesef bu tarihte yerimiz dolmuş' de.",
  ];

  for (const t of tours) {
    lines.push(`\n### 🎯 ${t.name}`);
    if (t.description) lines.push(`Açıklama: ${t.description}`);
    if (t.tour_type) lines.push(`Tur Tipi: ${formatTourType(t.tour_type)}`);
    if (t.route) lines.push(`Rota: ${t.route}`);
    if (t.departure_point) lines.push(`Kalkış Noktası: ${t.departure_point}`);
    if (t.destination) lines.push(`Varış: ${t.destination}`);
    if (t.departure_time && t.return_time) lines.push(`Saat: ${t.departure_time} - ${t.return_time}`);
    if (t.duration_hours) lines.push(`Süre: ${t.duration_hours} saat`);
    if (t.duration_days && t.duration_days > 1) lines.push(`Süre: ${t.duration_days} gün`);
    lines.push(`Kapasite: Günlük ${t.capacity} kişi`);
    if (t.price_per_person) lines.push(`Yetişkin Fiyatı: ${t.price_per_person} ${t.currency || "TL"}/kişi`);
    if (t.child_price != null) lines.push(`Çocuk Fiyatı (0-${t.child_age_limit || 12}): ${t.child_price} ${t.currency || "TL"}/kişi`);
    if (t.vehicle_type) lines.push(`Araç/Tekne Tipi: ${t.vehicle_type}`);
    if (t.cancellation_policy) lines.push(`İptal Koşulları: ${t.cancellation_policy}`);
    if (t.what_to_bring) lines.push(`Yanınıza Alın: ${t.what_to_bring}`);
    if (t.extra_info) lines.push(`Not: ${t.extra_info}`);
    if (t.cover_photo) lines.push(`📸 Kapak fotoğrafı mevcut`);
    if (t.gallery_url) lines.push(`🔗 Galeri/Fotoğraflar: ${t.gallery_url}`);

    // Ödeme bilgileri
    const paymentMethods: string[] = [];
    if (t.accepts_credit_card) paymentMethods.push("Kredi Kartı");
    if (t.accepts_cash) paymentMethods.push("Nakit");
    if (t.accepts_bank_transfer) paymentMethods.push("Banka Havalesi");
    if (paymentMethods.length) {
      lines.push(`💳 Ödeme Yöntemleri: ${paymentMethods.join(", ")}`);
    }
    if (t.requires_deposit && t.deposit_amount) {
      lines.push(`💰 Ön Ödeme/Kaparo: ${t.deposit_amount} ${t.currency || "TL"}`);
    }
    if (t.payment_terms) {
      lines.push(`ℹ️ Ödeme Şartları: ${t.payment_terms}`);
    }
    if (t.accepts_bank_transfer && t.selected_iban_ids?.length > 0) {
      lines.push(`🏦 Havale için IBAN bilgileri mevcut (create_tour_booking sonrası müşteriye iletilecek)`);
    }

    // Aktif günler
    if (t.available_days?.length) {
      const dayNames = t.available_days.map((d: string) => DAY_LABELS[d] || d).join(", ");
      lines.push(`Varsayılan Aktif Günler: ${dayNames}`);
    }

    // Sezon
    if (t.season_start && t.season_end) {
      lines.push(`Sezon: ${t.season_start} — ${t.season_end}`);
    }

    // Yakın tarih override'ları (AI'ın bilmesi için)
    const tourOverrides = overrideMap[t.id] || [];
    const closedDates = tourOverrides.filter((o: any) => !o.is_active);
    const extraDates = tourOverrides.filter((o: any) => o.is_active);

    if (closedDates.length) {
      lines.push(`⚠️ Kapalı tarihler: ${closedDates.map((o: any) => o.date + (o.note ? ` (${o.note})` : "")).join(", ")}`);
    }
    if (extraDates.length) {
      lines.push(`📌 Ek aktif tarihler: ${extraDates.map((o: any) => o.date).join(", ")}`);
    }

    // Hizmet seçenekleri
    const services = (t.tour_service_options || []).filter((s: any) => s.is_active);
    const included = services.filter((s: any) => s.is_included);
    const optional = services.filter((s: any) => !s.is_included);

    if (included.length) {
      lines.push(`✅ Fiyata Dahil: ${included.map((s: any) => s.name).join(", ")}`);
    }
    if (optional.length) {
      lines.push(`💰 Opsiyonel Hizmetler: ${optional.map((s: any) =>
        `${s.name} (+${s.price} ${t.currency || "TL"}${s.is_per_person ? "/kişi" : ""})`
      ).join(", ")}`);
    }
  }

  return lines.join("\n");
}

function formatTourType(type: string): string {
  const types: Record<string, string> = {
    day_trip: "Günlük Tur",
    half_day: "Yarım Gün Tur",
    cultural: "Kültürel Tur / Günlük",
    adventure: "Macera Turu / Günlük",
    entertainment: "Eğlence Turu",
    night_tour: "Gece Turu",
  };
  return types[type] || type;
}
