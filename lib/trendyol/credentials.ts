/**
 * Trendyol Credentials Helper
 * Tenant ID'ye göre Trendyol API bilgilerini getirir.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { TrendyolCredentials } from "@/lib/trendyol/client";

/**
 * Bir tenant'ın Trendyol API bilgilerini döndürür.
 * Bağlantı yoksa veya aktif değilse null döner.
 */
export async function getTrendyolCredentials(
  tenantId: string
): Promise<TrendyolCredentials | null> {
  const supabase = createAdminClient();

  const { data: conn } = await supabase
    .from("channel_connections")
    .select("meta_identifiers, status")
    .eq("tenant_id", tenantId)
    .eq("channel", "trendyol")
    .maybeSingle();

  if (!conn || conn.status !== "connected") return null;

  const meta = conn.meta_identifiers as any;
  if (!meta?.supplier_id || !meta?.api_key || !meta?.api_secret) return null;

  return {
    supplierId: meta.supplier_id,
    apiKey: meta.api_key,
    apiSecret: meta.api_secret,
  };
}

/**
 * Aktif Trendyol bağlantısı olan tüm tenant'ları döndürür.
 */
export async function getAllTrendyolTenants(): Promise<string[]> {
  const supabase = createAdminClient();

  const { data: connections } = await supabase
    .from("channel_connections")
    .select("tenant_id")
    .eq("channel", "trendyol")
    .eq("status", "connected");

  return (connections || []).map((c) => c.tenant_id);
}
