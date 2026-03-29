"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getTenantTrendyolData(tenantId: string) {
    const supabase = createAdminClient();

    // Toplam ürün
    const { count: totalProducts } = await supabase
        .from("trendyol_products")
        .select("*", { count: "exact", head: true })
        .eq("business_id", tenantId)
        .eq("is_active", true);

    // Cevaplanan toplam soru
    const { count: answeredQuestions } = await supabase
        .from("trendyol_questions")
        .select("*", { count: "exact", head: true })
        .eq("business_id", tenantId)
        .eq("status", "answered");

    // Bu ayki cevaplanan soru
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: monthlyAnswered } = await supabase
        .from("trendyol_questions")
        .select("*", { count: "exact", head: true })
        .eq("business_id", tenantId)
        .eq("status", "answered")
        .gte("created_at", startOfMonth.toISOString());

    // Stok alarmları (notifications tablosundan)
    const { count: stockAlerts } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .in("type", ["TRENDYOL_STOCK_WARNING", "TRENDYOL_STOCK_CRITICAL"]);

    // Son cevaplanan sorular (son 50 tane)
    const { data: recentQuestions } = await supabase
        .from("trendyol_questions")
        .select("*")
        .eq("business_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(50);

    return {
        totalProducts: totalProducts || 0,
        answeredQuestions: answeredQuestions || 0,
        monthlyAnswered: monthlyAnswered || 0,
        stockAlerts: stockAlerts || 0,
        recentQuestions: recentQuestions || [],
    };
}
