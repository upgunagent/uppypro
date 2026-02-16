'use server';

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { getUsdExchangeRate } from "@/lib/currency";

export async function updatePricing(productKey: string, priceUsd: number) {
    const admin = createAdminClient();

    // priceUsd received as normal number (e.g. 19), save as is (numeric)
    const { error } = await admin
        .from('pricing')
        .update({ monthly_price_usd: priceUsd })
        .eq('product_key', productKey)
        .eq('billing_cycle', 'monthly');

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/');
    revalidatePath('/panel/settings');
    revalidatePath('/admin/pricing');

    return { success: true };
}

export async function getExchangeRate(): Promise<number> {
    try {
        const rate = await getUsdExchangeRate();
        return rate;
    } catch (error) {
        console.error("[PRICING ACTION] Error fetching exchange rate:", error);
        return 44.00; // Fallback
    }
}

export async function getProductPrices() {
    const admin = createAdminClient();

    const { data, error } = await admin
        .from('pricing')
        .select('product_key, monthly_price_usd')
        .eq('billing_cycle', 'monthly');

    if (error || !data) {
        console.error("[PRICING ACTION] Error fetching prices:", error);
        // Fallback prices
        return {
            inbox: 19.99,
            ai: 79.99,
            ai_medium: 159.98,
            ai_pro: 289.96
        };
    }

    // Convert array to object
    const prices = data.reduce((acc, item) => {
        acc[item.product_key] = item.monthly_price_usd;
        return acc;
    }, {} as Record<string, number>);

    return {
        inbox: prices.inbox || 19.99,
        ai: prices.ai_starter || 79.99,
        ai_medium: prices.ai_medium || 159.98,
        ai_pro: prices.ai_pro || 289.96
    };
}
