/**
 * Trendyol bağlandığında sistem mesajına araç tanımlarını otomatik ekler.
 * Bağlantı kesildiğinde bloğu silmez (tekrar bağlanma ihtimali için).
 */

import { createAdminClient } from "@/lib/supabase/admin";

const TRENDYOL_BLOCK_MARKER = "### TRENDYOL MAĞAZA YÖNETİMİ";

const TRENDYOL_SYSTEM_BLOCK = `

### TRENDYOL MAĞAZA YÖNETİMİ

Sen aynı zamanda işletmenin Trendyol mağazasının AI asistanısın.

**Ürün Önerisi ve Satış:**
- Müşteri bir ürün sorduğunda, aradığında veya almak istediğinde \`search_trendyol_products\` aracını kullan.
- Bulunan ürünleri fiyat, stok ve özelliklerle birlikte listele.
- Her ürünün Trendyol satış linkini MUTLAKA paylaş.
- İndirimli ürünlerde eski fiyatı üstü çizili, yeni fiyatı vurgulu göster.
- Stokta olmayan ürünleri önerme.
- Müşterinin bütçesine ve ihtiyaçlarına göre en uygun ürünleri seç.
- En fazla 3-4 ürün öner, çok uzun listeler yapma.

**Sipariş Sorgulama:**
- Müşteri sipariş durumu sorduğunda \`check_trendyol_order\` aracını kullan.
- Sipariş numarası ile sorgulama yap.
- Kargo takip numarası ve tahmini teslim tarihini paylaş.

**İade İşlemleri:**
- Müşteri iade talebinde bulunduğunda \`create_trendyol_return\` aracını kullan.
- İade sebebini mutlaka sor.
- İade kodunu ve kargo bilgilerini müşteriye ilet.

### ARAÇ KULLANIM TALİMATLARI (TRENDYOL)
1. search_trendyol_products — Ürün arama, filtreleme ve müşteriye önerme
2. check_trendyol_order — Sipariş durumu sorgulama
3. create_trendyol_return — İade talebi oluşturma
`;

/**
 * Sistem mesajına Trendyol araç bloğunu enjekte eder.
 * Eğer blok zaten varsa tekrar eklemez.
 */
export async function injectTrendyolToolsToSystemMessage(
  tenantId: string
): Promise<{ updated: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Mevcut sistem mesajını oku
  const { data: settings, error: fetchError } = await supabase
    .from("agent_settings")
    .select("system_message")
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError || !settings) {
    return { updated: false, error: "Sistem mesajı bulunamadı" };
  }

  const currentMessage = settings.system_message || "";

  // Sistem mesajı boşsa (sihirbaz henüz kullanılmamış), enjeksiyon yapma.
  // Sihirbaz tamamlandığında otomatik olarak eklenecek.
  if (!currentMessage.trim()) {
    return { updated: false };
  }

  // Zaten ekli mi kontrol et
  if (currentMessage.includes(TRENDYOL_BLOCK_MARKER)) {
    return { updated: false };
  }

  // Mesajın sonuna Trendyol bloğunu ekle
  const updatedMessage = currentMessage.trimEnd() + "\n" + TRENDYOL_SYSTEM_BLOCK;

  const { error: updateError } = await supabase
    .from("agent_settings")
    .update({ system_message: updatedMessage })
    .eq("tenant_id", tenantId);

  if (updateError) {
    return { updated: false, error: updateError.message };
  }

  return { updated: true };
}

/**
 * Sistem mesajında Trendyol bloğu olup olmadığını kontrol eder.
 */
export function hasTrendyolBlock(systemMessage: string): boolean {
  return systemMessage.includes(TRENDYOL_BLOCK_MARKER);
}
