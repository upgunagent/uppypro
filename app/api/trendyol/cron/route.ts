/**
 * Trendyol Cron Job API Route
 * Periyodik görevler: Ürün senkronizasyonu, stok alarmları, müşteri soruları
 * 
 * Vercel Cron veya harici bir scheduler ile çağrılır.
 * Authorization: Bearer CRON_SECRET header'ı ile korunur.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAllTrendyolTenants, getTrendyolCredentials } from "@/lib/trendyol/credentials";
import { fetchUpdatedProducts, buildProductUrl } from "@/lib/trendyol/client";
import { checkStockAlerts } from "@/lib/trendyol/stock-alerts";
import { processUnansweredQuestions } from "@/lib/trendyol/question-answerer";

const CRON_SECRET = process.env.CRON_SECRET || "";

export async function GET(req: NextRequest) {
  // Güvenlik kontrolü
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, any> = {};

  try {
    // Tüm aktif Trendyol tenant'larını al
    const tenantIds = await getAllTrendyolTenants();

    if (tenantIds.length === 0) {
      return NextResponse.json({ message: "No active Trendyol connections", tenants: 0 });
    }

    const supabase = createAdminClient();

    for (const tenantId of tenantIds) {
      const tenantResult: Record<string, any> = { tenantId };

      try {
        const creds = await getTrendyolCredentials(tenantId);
        if (!creds) {
          tenantResult.skipped = true;
          results[tenantId] = tenantResult;
          continue;
        }

        // 1. Ürün Senkronizasyonu (son 30 dakikada güncellenenler)
        try {
          const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
          const updatedProducts = await fetchUpdatedProducts(creds, thirtyMinAgo);

          if (updatedProducts.length > 0) {
            // Ürünleri DB'ye güncelle
            for (const product of updatedProducts) {
              const productUrl = product.productUrl || buildProductUrl(
                product.contentId || (product as any).productContentId || Number(product.id),
                product.brand?.name,
                product.title,
                creds.supplierId
              );

              await supabase.from("trendyol_products").upsert(
                {
                  business_id: tenantId,
                  trendyol_product_id: String(product.id),
                  product_code: String(product.productCode),
                  barcode: product.barcode || "",
                  title: product.title,
                  description: product.description || "",
                  brand: product.brand?.name || "",
                  category_name: product.categoryName || "",
                  sale_price: product.salePrice,
                  list_price: product.listPrice,
                  quantity: product.quantity,
                  images: product.images || [],
                  attributes: product.attributes || [],
                  product_url: productUrl,
                  is_active: product.approved !== false,
                  last_synced_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "business_id, trendyol_product_id" }
              );
            }

            tenantResult.productSync = {
              updated: updatedProducts.length,
            };
          } else {
            tenantResult.productSync = { updated: 0 };
          }
        } catch (syncErr: any) {
          console.error(`[Cron] Product sync error for ${tenantId}:`, syncErr.message);
          tenantResult.productSync = { error: syncErr.message };
        }

        // 2. Stok Alarm Kontrolü
        try {
          const alertResult = await checkStockAlerts(tenantId);
          tenantResult.stockAlerts = alertResult;
        } catch (alertErr: any) {
          console.error(`[Cron] Stock alert error for ${tenantId}:`, alertErr.message);
          tenantResult.stockAlerts = { error: alertErr.message };
        }

        // 3. Müşteri Soruları Otomatik Cevaplama
        try {
          const qaResult = await processUnansweredQuestions(tenantId);
          tenantResult.questionAnswering = qaResult;
        } catch (qaErr: any) {
          console.error(`[Cron] QA error for ${tenantId}:`, qaErr.message);
          tenantResult.questionAnswering = { error: qaErr.message };
        }
      } catch (tenantErr: any) {
        console.error(`[Cron] Error processing tenant ${tenantId}:`, tenantErr.message);
        tenantResult.error = tenantErr.message;
      }

      results[tenantId] = tenantResult;
    }

    return NextResponse.json({
      success: true,
      tenantsProcessed: tenantIds.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[Cron] Fatal error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
