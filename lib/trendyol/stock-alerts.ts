/**
 * Trendyol Stok Alarm Sistemi
 * Ürün stoku ≤5 ve ≤1 olduğunda panel bildirimi gönderir.
 * Her ürün için en fazla 2 bildirim (sarı + kırmızı).
 * Stok tekrar artarsa sayaçlar sıfırlanır.
 */

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Bir tenant'ın tüm Trendyol ürünlerinin stok durumunu kontrol eder
 * ve gerekli bildirimleri oluşturur.
 */
export async function checkStockAlerts(tenantId: string): Promise<{
  warnings: number;
  criticals: number;
  resets: number;
}> {
  const supabase = createAdminClient();
  let warnings = 0;
  let criticals = 0;
  let resets = 0;

  // 1. Stok ≤ 5 ama henüz uyarı gönderilmemiş ürünler
  const { data: lowStockProducts } = await supabase
    .from("trendyol_products")
    .select("id, title, quantity, stock_alert_5_sent, stock_alert_1_sent")
    .eq("business_id", tenantId)
    .eq("is_active", true)
    .lte("quantity", 5)
    .eq("stock_alert_5_sent", false);

  if (lowStockProducts && lowStockProducts.length > 0) {
    for (const product of lowStockProducts) {
      // Sarı uyarı bildirimi gönder
      await supabase.from("notifications").insert({
        tenant_id: tenantId,
        type: "TRENDYOL_STOCK_WARNING",
        title: "🟡 Trendyol Stok Uyarısı",
        message: `"${product.title}" ürününün stoku ${product.quantity} adede düştü.`,
        metadata: {
          product_id: product.id,
          product_title: product.title,
          quantity: product.quantity,
          alert_level: "warning",
        },
      });

      // Flag güncelle
      await supabase
        .from("trendyol_products")
        .update({ stock_alert_5_sent: true })
        .eq("id", product.id);

      warnings++;
    }
  }

  // 2. Stok ≤ 1 ama henüz kritik uyarı gönderilmemiş ürünler
  const { data: criticalStockProducts } = await supabase
    .from("trendyol_products")
    .select("id, title, quantity, stock_alert_1_sent")
    .eq("business_id", tenantId)
    .eq("is_active", true)
    .lte("quantity", 1)
    .eq("stock_alert_1_sent", false);

  if (criticalStockProducts && criticalStockProducts.length > 0) {
    for (const product of criticalStockProducts) {
      // Kırmızı kritik bildirim gönder
      await supabase.from("notifications").insert({
        tenant_id: tenantId,
        type: "TRENDYOL_STOCK_CRITICAL",
        title: "🔴 Trendyol Kritik Stok!",
        message: `"${product.title}" ürününde ${product.quantity === 0 ? "stok tükendi!" : "son 1 adet kaldı!"}`,
        metadata: {
          product_id: product.id,
          product_title: product.title,
          quantity: product.quantity,
          alert_level: "critical",
        },
      });

      // Flag güncelle
      await supabase
        .from("trendyol_products")
        .update({ stock_alert_1_sent: true })
        .eq("id", product.id);

      criticals++;
    }
  }

  // 3. Stok > 5'e çıkan ürünlerin flag'lerini sıfırla
  const { data: recoveredProducts } = await supabase
    .from("trendyol_products")
    .select("id")
    .eq("business_id", tenantId)
    .eq("is_active", true)
    .gt("quantity", 5)
    .or("stock_alert_5_sent.eq.true,stock_alert_1_sent.eq.true");

  if (recoveredProducts && recoveredProducts.length > 0) {
    const ids = recoveredProducts.map((p: any) => p.id);
    await supabase
      .from("trendyol_products")
      .update({
        stock_alert_5_sent: false,
        stock_alert_1_sent: false,
      })
      .in("id", ids);

    resets = recoveredProducts.length;
  }

  return { warnings, criticals, resets };
}
