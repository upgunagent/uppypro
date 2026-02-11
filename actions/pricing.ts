"use server";

import { createClient } from "@/lib/supabase/server";

export async function getProductPrices() {
    const supabase = await createClient();

    const { data: prices, error } = await supabase
        .from("pricing")
        .select("*")
        .in("product_key", ["uppypro_inbox", "uppypro_ai"])
        .eq("billing_cycle", "monthly");

    if (error) {
        console.error("Pricing Fetch Error:", error);
        return { inbox: 19.99, ai: 79.99 }; // Fallback defaults
    }

    const inboxPrice = prices?.find(p => p.product_key === "uppypro_inbox")?.monthly_price_usd || 19.99;
    const aiPrice = prices?.find(p => p.product_key === "uppypro_ai")?.monthly_price_usd || 79.99;

    return { inbox: inboxPrice, ai: aiPrice };
}

export async function getExchangeRate() {
    const { getUsdExchangeRate } = await import("@/lib/currency");
    return getUsdExchangeRate();
}
