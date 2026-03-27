"use server";

import { createAdminClient } from "@/lib/supabase/admin";

// Tarih yardımcıları
function getDateRange(period: "today" | "week" | "month") {
  const now = new Date();
  let start: Date;

  switch (period) {
    case "today":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      break;
    case "month":
      start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      break;
  }

  return { start: start.toISOString(), end: now.toISOString() };
}

/**
 * AI Maliyet Özet verileri
 */
export async function getAiCostSummary() {
  const supabase = createAdminClient();
  const periods = ["today", "week", "month"] as const;
  const summary: Record<string, any> = {};

  for (const period of periods) {
    const { start, end } = getDateRange(period);
    const { data } = await supabase
      .from("api_usage_logs")
      .select("estimated_cost, input_tokens, output_tokens")
      .eq("api_type", "gemini")
      .gte("created_at", start)
      .lte("created_at", end);

    if (data) {
      summary[period] = {
        totalCost: data.reduce((sum, r) => sum + Number(r.estimated_cost || 0), 0),
        totalRequests: data.length,
        totalInputTokens: data.reduce((sum, r) => sum + (r.input_tokens || 0), 0),
        totalOutputTokens: data.reduce((sum, r) => sum + (r.output_tokens || 0), 0),
      };
    } else {
      summary[period] = { totalCost: 0, totalRequests: 0, totalInputTokens: 0, totalOutputTokens: 0 };
    }
  }

  return summary;
}

/**
 * Son 30 günlük maliyet trend verileri
 */
export async function getAiCostTrend() {
  const supabase = createAdminClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data } = await supabase
    .from("api_usage_logs")
    .select("created_at, estimated_cost, model, input_tokens, output_tokens")
    .eq("api_type", "gemini")
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: true });

  if (!data || data.length === 0) return [];

  // Günlere göre grupla
  const dailyMap: Record<string, { date: string; cost: number; requests: number; flash: number; pro: number }> = {};

  data.forEach((row) => {
    const date = new Date(row.created_at).toISOString().split("T")[0];
    if (!dailyMap[date]) {
      dailyMap[date] = { date, cost: 0, requests: 0, flash: 0, pro: 0 };
    }
    dailyMap[date].cost += Number(row.estimated_cost || 0);
    dailyMap[date].requests += 1;
    if (row.model?.includes("flash")) {
      dailyMap[date].flash += 1;
    } else {
      dailyMap[date].pro += 1;
    }
  });

  return Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Model bazlı dağılım
 */
export async function getModelDistribution() {
  const supabase = createAdminClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data } = await supabase
    .from("api_usage_logs")
    .select("model, estimated_cost, input_tokens, output_tokens")
    .eq("api_type", "gemini")
    .gte("created_at", thirtyDaysAgo.toISOString());

  if (!data) return [];

  const modelMap: Record<string, { model: string; cost: number; requests: number; tokens: number }> = {};

  data.forEach((row) => {
    const model = row.model || "unknown";
    if (!modelMap[model]) {
      modelMap[model] = { model, cost: 0, requests: 0, tokens: 0 };
    }
    modelMap[model].cost += Number(row.estimated_cost || 0);
    modelMap[model].requests += 1;
    modelMap[model].tokens += (row.input_tokens || 0) + (row.output_tokens || 0);
  });

  return Object.values(modelMap);
}

/**
 * Tenant bazlı kullanım verileri
 */
export async function getTenantUsage() {
  const supabase = createAdminClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Tenant bilgileri ve kullanımları
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, name");

  const { data: usageData } = await supabase
    .from("api_usage_logs")
    .select("tenant_id, api_type, model, estimated_cost, input_tokens, output_tokens")
    .gte("created_at", thirtyDaysAgo.toISOString());

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("tenant_id, ai_product_key")
    .order("created_at", { ascending: false });

  // Tenant map oluştur
  const tenantMap: Record<string, any> = {};

  (tenants || []).forEach((t) => {
    tenantMap[t.id] = {
      id: t.id,
      name: t.name || "İsimsiz",
      package: "—",
      model: "—",
      totalRequests: 0,
      totalCost: 0,
      totalTokens: 0,
      geminiRequests: 0,
      trendyolRequests: 0,
      whatsappRequests: 0,
      instagramRequests: 0,
    };
  });

  // Abonelik bilgisi
  (subscriptions || []).forEach((s) => {
    if (tenantMap[s.tenant_id] && tenantMap[s.tenant_id].package === "—") {
      tenantMap[s.tenant_id].package = s.ai_product_key || "—";
    }
  });

  // Kullanım verilerini tenant'lara dağıt
  (usageData || []).forEach((u) => {
    if (!tenantMap[u.tenant_id]) return;
    const t = tenantMap[u.tenant_id];
    t.totalRequests += 1;
    t.totalCost += Number(u.estimated_cost || 0);
    t.totalTokens += (u.input_tokens || 0) + (u.output_tokens || 0);

    if (u.api_type === "gemini") {
      t.geminiRequests += 1;
      if (u.model) t.model = u.model;
    }
    if (u.api_type === "trendyol") t.trendyolRequests += 1;
    if (u.api_type === "whatsapp") t.whatsappRequests += 1;
    if (u.api_type === "instagram") t.instagramRequests += 1;
  });

  return Object.values(tenantMap)
    .filter((t) => t.totalRequests > 0)
    .sort((a, b) => b.totalCost - a.totalCost);
}

/**
 * Trendyol raporlama verileri
 */
export async function getTrendyolReport() {
  const supabase = createAdminClient();

  // Aktif Trendyol bağlantıları
  const { count: activeConnections } = await supabase
    .from("channel_connections")
    .select("*", { count: "exact", head: true })
    .eq("channel", "trendyol")
    .eq("status", "connected");

  // Toplam ürün
  const { count: totalProducts } = await supabase
    .from("trendyol_products")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  // Cevaplanan sorular
  const { count: answeredQuestions } = await supabase
    .from("trendyol_questions")
    .select("*", { count: "exact", head: true })
    .eq("status", "answered");

  // Stok alarmları (notifications)
  const { count: stockAlerts } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .in("type", ["TRENDYOL_STOCK_WARNING", "TRENDYOL_STOCK_CRITICAL"]);

  // Son sorular
  const { data: recentQuestions } = await supabase
    .from("trendyol_questions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  return {
    activeConnections: activeConnections || 0,
    totalProducts: totalProducts || 0,
    answeredQuestions: answeredQuestions || 0,
    stockAlerts: stockAlerts || 0,
    recentQuestions: recentQuestions || [],
  };
}

/**
 * Kanal bazlı rapor
 */
export async function getChannelReport() {
  const supabase = createAdminClient();
  const periods = ["today", "week", "month"] as const;
  const result: Record<string, any> = {};

  for (const period of periods) {
    const { start, end } = getDateRange(period);

    // Mesaj sayıları
    const { data: messages } = await supabase
      .from("messages")
      .select("direction, conversations!inner(channel)")
      .gte("created_at", start)
      .lte("created_at", end);

    const stats = {
      whatsapp: { in: 0, out: 0 },
      instagram: { in: 0, out: 0 },
    };

    (messages || []).forEach((msg: any) => {
      const ch = msg.conversations?.channel;
      const dir = msg.direction === "IN" ? "in" : "out";
      if (ch === "whatsapp") stats.whatsapp[dir]++;
      if (ch === "instagram") stats.instagram[dir]++;
    });

    result[period] = stats;
  }

  // Son 30 gün trend (günlük)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: trendMessages } = await supabase
    .from("messages")
    .select("created_at, direction, conversations!inner(channel)")
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: true });

  const dailyTrend: Record<string, { date: string; whatsapp: number; instagram: number }> = {};

  (trendMessages || []).forEach((msg: any) => {
    const date = new Date(msg.created_at).toISOString().split("T")[0];
    const ch = msg.conversations?.channel;
    if (!dailyTrend[date]) {
      dailyTrend[date] = { date, whatsapp: 0, instagram: 0 };
    }
    if (ch === "whatsapp") dailyTrend[date].whatsapp++;
    if (ch === "instagram") dailyTrend[date].instagram++;
  });

  result.trend = Object.values(dailyTrend).sort((a, b) => a.date.localeCompare(b.date));

  // Konuşma sayıları
  const { count: totalConversations } = await supabase
    .from("conversations")
    .select("*", { count: "exact", head: true });

  const { count: aiHandled } = await supabase
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .eq("assignment", "ai");

  result.totalConversations = totalConversations || 0;
  result.aiHandled = aiHandled || 0;
  result.humanHandled = (totalConversations || 0) - (aiHandled || 0);

  return result;
}

/**
 * Gelir & Kârlılık raporu
 */
export async function getRevenueReport() {
  const supabase = createAdminClient();

  // Aktif abonelikler ve paketleri
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("tenant_id, ai_product_key, tenants(name)")
    .eq("status", "active");

  // Paket fiyatları (yaklaşık)
  const packagePricing: Record<string, number> = {
    "starter": 299,
    "professional": 499,
    "enterprise": 999,
    "kurumsal_free": 0,
    "profesyonel_free": 0,
  };

  // AI maliyetleri
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: costs } = await supabase
    .from("api_usage_logs")
    .select("tenant_id, estimated_cost")
    .eq("api_type", "gemini")
    .gte("created_at", thirtyDaysAgo.toISOString());

  // Tenant bazlı maliyet
  const costMap: Record<string, number> = {};
  (costs || []).forEach((c) => {
    costMap[c.tenant_id] = (costMap[c.tenant_id] || 0) + Number(c.estimated_cost || 0);
  });

  // Kârlılık hesapla
  const tenantProfits = (subs || []).map((s: any) => {
    const revenue = packagePricing[s.ai_product_key] || 0;
    const aiCostUsd = costMap[s.tenant_id] || 0;
    const aiCostTry = aiCostUsd * 32; // Yaklaşık kur
    const profit = revenue - aiCostTry;
    const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

    return {
      tenantId: s.tenant_id,
      name: s.tenants?.name || "İsimsiz",
      package: s.ai_product_key || "—",
      revenue,
      aiCostUsd: Math.round(aiCostUsd * 100) / 100,
      aiCostTry: Math.round(aiCostTry * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      margin,
    };
  });

  const totalRevenue = tenantProfits.reduce((sum, t) => sum + t.revenue, 0);
  const totalCostTry = tenantProfits.reduce((sum, t) => sum + t.aiCostTry, 0);

  return {
    totalRevenue,
    totalCostTry: Math.round(totalCostTry * 100) / 100,
    netProfit: Math.round((totalRevenue - totalCostTry) * 100) / 100,
    margin: totalRevenue > 0 ? Math.round(((totalRevenue - totalCostTry) / totalRevenue) * 100) : 0,
    activeSubscriptions: (subs || []).length,
    tenants: tenantProfits.sort((a, b) => b.revenue - a.revenue),
  };
}
