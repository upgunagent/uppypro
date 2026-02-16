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
        // Fallback defaults
        return {
            inbox: 19.99,
            ai: 79.99,
            ai_medium: 159.99, // 2x ai
            ai_pro: 289.99     // ~3.6x ai
        };
    }

    const inboxPriceUSD = prices?.find(p => p.product_key === "uppypro_inbox")?.monthly_price_usd || 19.99;
    const aiPriceUSD = prices?.find(p => p.product_key === "uppypro_ai")?.monthly_price_usd || 79.99;

    // Derived prices logic should match what was intended. 
    // Assuming multipliers: Medium = 2x, Pro = 3.6x of Base AI price
    const aiMediumUSD = aiPriceUSD * 2;
    const aiProUSD = aiPriceUSD * 3.6;

    return {
        inbox: inboxPriceUSD,
        ai: aiPriceUSD,
        ai_medium: aiMediumUSD,
        ai_pro: aiProUSD
    };
}

export async function getExchangeRate() {
    const { getUsdExchangeRate } = await import("@/lib/currency");
    return getUsdExchangeRate();
}
