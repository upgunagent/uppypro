"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  testConnection,
  fetchAllProducts,
  buildProductUrl,
  type TrendyolCredentials,
  type TrendyolProduct,
} from "@/lib/trendyol/client";
import { injectTrendyolToolsToSystemMessage } from "@/lib/trendyol/system-message-inject";
import { isKurumsal } from "@/lib/subscription-utils";

/**
 * Trendyol mağaza bağlantısını kurar
 */
export async function connectTrendyolAction(data: {
  supplierId: string;
  apiKey: string;
  apiSecret: string;
}) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: member } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!member) return { success: false, error: "Tenant bulunamadı" };

  // Paket kontrolü
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("ai_product_key")
    .eq("tenant_id", member.tenant_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!isKurumsal(subscription)) {
    return {
      success: false,
      error: "Trendyol entegrasyonu sadece UppyPro Kurumsal paketinde kullanılabilir.",
    };
  }

  // Trendyol API bağlantısını test et
  const creds: TrendyolCredentials = {
    supplierId: data.supplierId,
    apiKey: data.apiKey,
    apiSecret: data.apiSecret,
  };

  const testResult = await testConnection(creds);
  
  // Cloudflare engeli varsa yine de kaydet (deploy sonrası çalışacak)
  const isCloudflareBlock = !testResult.success && testResult.error?.includes("Cloudflare");
  
  if (!testResult.success && !isCloudflareBlock) {
    return {
      success: false,
      error: `Trendyol bağlantı hatası: ${testResult.error}`,
    };
  }

  // channel_connections tablosuna kaydet
  const { error: upsertError } = await admin.from("channel_connections").upsert(
    {
      tenant_id: member.tenant_id,
      channel: "trendyol",
      status: "connected",
      meta_identifiers: {
        supplier_id: data.supplierId,
        total_products: testResult.totalProducts || 0,
      },
      access_token_encrypted: JSON.stringify({
        apiKey: data.apiKey,
        apiSecret: data.apiSecret,
      }),
    },
    { onConflict: "tenant_id, channel" }
  );

  if (upsertError) {
    return { success: false, error: upsertError.message };
  }

  // Sistem mesajına Trendyol tool tanımlarını enjekte et
  const injectResult = await injectTrendyolToolsToSystemMessage(member.tenant_id);
  
  // Cloudflare engeli yoksa senkronizasyonu başlat
  if (!isCloudflareBlock) {
    syncTrendyolProductsBackground(member.tenant_id, creds).catch((err) => {
      console.error("[Trendyol] Background sync error:", err);
    });
  }

  revalidatePath("/panel/settings");
  return {
    success: true,
    totalProducts: testResult.totalProducts || 0,
    systemMessageUpdated: injectResult.updated,
    cloudflareWarning: isCloudflareBlock
      ? "Trendyol API güvenlik duvarı bağlantıyı engelledi ancak bilgileriniz kaydedildi. Birkaç dakika sonra 'Ürünleri Senkronize Et' butonuyla tekrar deneyin."
      : undefined,
  };
}

/**
 * Trendyol bağlantısını keser
 */
export async function disconnectTrendyolAction() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: member } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!member) throw new Error("Tenant bulunamadı");

  // Bağlantıyı sil
  await admin
    .from("channel_connections")
    .delete()
    .match({ tenant_id: member.tenant_id, channel: "trendyol" });

  // Ürün tablosundaki verileri temizle
  await admin
    .from("trendyol_products")
    .delete()
    .eq("business_id", member.tenant_id);

  // NOT: Sistem mesajındaki Trendyol bloğu SİLİNMEZ
  // (tekrar bağlanma ihtimali için, tool disabled olarak çalışır)

  revalidatePath("/panel/settings");
}

/**
 * Trendyol credential'larını channel_connections'dan çeker
 */
export async function getTrendyolCredentials(
  tenantId: string
): Promise<TrendyolCredentials | null> {
  const admin = createAdminClient();
  const { data: conn } = await admin
    .from("channel_connections")
    .select("meta_identifiers, access_token_encrypted")
    .eq("tenant_id", tenantId)
    .eq("channel", "trendyol")
    .maybeSingle();

  if (!conn) return null;

  try {
    const tokens = JSON.parse(conn.access_token_encrypted);
    return {
      supplierId: conn.meta_identifiers.supplier_id,
      apiKey: tokens.apiKey,
      apiSecret: tokens.apiSecret,
    };
  } catch {
    return null;
  }
}

/**
 * Ürünleri arka planda senkronize eder
 */
async function syncTrendyolProductsBackground(
  tenantId: string,
  creds: TrendyolCredentials
) {
  const admin = createAdminClient();
  console.log(`[Trendyol] Starting product sync for tenant ${tenantId}...`);

  const products = await fetchAllProducts(creds);
  console.log(`[Trendyol] Fetched ${products.length} products`);

  // Batch upsert (50'şer)
  const batchSize = 50;
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const rows = batch.map((p: TrendyolProduct) => ({
      business_id: tenantId,
      trendyol_product_id: String(p.id),
      product_code: String(p.productCode),
      barcode: p.barcode || "",
      title: p.title || "",
      description: p.description || "",
      brand: p.brand?.name || "",
      category_name: p.categoryName || "",
      sale_price: p.salePrice || 0,
      list_price: p.listPrice || 0,
      quantity: p.quantity || 0,
      images: (p.images || []).map((img) => img.url),
      attributes: (p.attributes || []).reduce(
        (acc: Record<string, string>, attr) => {
          if (attr.attributeName && attr.attributeValue) {
            acc[attr.attributeName] = attr.attributeValue;
          }
          return acc;
        },
        {}
      ),
      product_url: p.productUrl || buildProductUrl(
        p.contentId || (p as any).productContentId || Number(p.id),
        p.brand?.name,
        p.title,
        creds.supplierId
      ),
      is_active: p.approved !== false,
      last_synced_at: new Date().toISOString(),
    }));

    const { error } = await admin.from("trendyol_products").upsert(rows, {
      onConflict: "business_id, trendyol_product_id",
    });

    if (error) {
      console.error(`[Trendyol] Batch upsert error:`, error);
    }
  }

  // Toplam ürün sayısını bağlantı bilgisine güncelle
  await admin
    .from("channel_connections")
    .update({
      meta_identifiers: {
        supplier_id: creds.supplierId,
        total_products: products.length,
        last_sync: new Date().toISOString(),
      },
    })
    .match({ tenant_id: tenantId, channel: "trendyol" });

  console.log(`[Trendyol] Sync completed: ${products.length} products for tenant ${tenantId}`);
}

/**
 * Manuel senkronizasyonu tetikler
 */
export async function syncTrendyolManualAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: member } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!member) return { success: false, error: "Tenant bulunamadı" };

  const creds = await getTrendyolCredentials(member.tenant_id);
  if (!creds) return { success: false, error: "Trendyol bağlantısı bulunamadı" };

  await syncTrendyolProductsBackground(member.tenant_id, creds);

  revalidatePath("/panel/settings");
  return { success: true };
}
