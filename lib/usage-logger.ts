/**
 * API Kullanım Loglama Yardımcısı
 * Her AI çağrısından sonra token ve maliyet bilgisini kaydeder.
 */

import { createAdminClient } from "@/lib/supabase/admin";

// Gemini model fiyatları ($ / 1M token)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gemini-2.5-flash": { input: 0.15, output: 0.60 },
  "gemini-2.5-flash-preview-05-20": { input: 0.15, output: 0.60 },
  "gemini-3-pro-preview": { input: 1.25, output: 10.00 },
  // Fallback
  default: { input: 0.50, output: 2.00 },
};

function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING.default;
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

export async function logAiUsage(params: {
  tenantId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  endpoint?: string;
  status?: string;
  metadata?: Record<string, any>;
}) {
  try {
    const cost = calculateCost(params.model, params.inputTokens, params.outputTokens);
    const supabase = createAdminClient();

    await supabase.from("api_usage_logs").insert({
      tenant_id: params.tenantId,
      api_type: "gemini",
      endpoint: params.endpoint || "chat",
      model: params.model,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      estimated_cost: cost,
      status: params.status || "success",
      metadata: params.metadata || {},
    });
  } catch (error) {
    // Loglama hatası ana işlemi bloklamasın
    console.error("[Usage Log] Error:", error);
  }
}

export async function logTrendyolUsage(params: {
  tenantId: string;
  endpoint: string;
  status?: string;
  metadata?: Record<string, any>;
}) {
  try {
    const supabase = createAdminClient();

    await supabase.from("api_usage_logs").insert({
      tenant_id: params.tenantId,
      api_type: "trendyol",
      endpoint: params.endpoint,
      model: "",
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost: 0,
      status: params.status || "success",
      metadata: params.metadata || {},
    });
  } catch (error) {
    console.error("[Usage Log] Trendyol error:", error);
  }
}

export async function logMessageUsage(params: {
  tenantId: string;
  channel: "whatsapp" | "instagram";
  direction: "in" | "out";
  metadata?: Record<string, any>;
}) {
  try {
    const supabase = createAdminClient();

    await supabase.from("api_usage_logs").insert({
      tenant_id: params.tenantId,
      api_type: params.channel,
      endpoint: params.direction === "in" ? "message_received" : "message_sent",
      model: "",
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost: 0,
      status: "success",
      metadata: params.metadata || {},
    });
  } catch (error) {
    console.error("[Usage Log] Message error:", error);
  }
}
