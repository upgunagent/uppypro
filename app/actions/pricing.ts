'use server';

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function updatePricing(productKey: string, priceTry: number, iyzicoCode: string) {
    const admin = createAdminClient();

    // priceTry received as normal number
    const { error } = await admin
        .from('pricing')
        .update({
            monthly_price_try: priceTry,
            iyzico_pricing_plan_reference_code: iyzicoCode
        })
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

// getExchangeRate removed as we use TL directly now.
// getUsdExchangeRate import also removed

export async function getProductPrices() {
    const admin = createAdminClient();

    const { data, error } = await admin
        .from('pricing')
        .select('product_key, monthly_price_try')
        .eq('billing_cycle', 'monthly');

    if (error || !data) {
        console.error("[PRICING ACTION] Error fetching prices:", error);
        // Fallback prices in TL (approximate from script)
        return {
            inbox: 895,
            ai: 3995,
            corporate_small: 4995,
            corporate_medium: 6995,
            corporate_large: 9995,
            corporate_xl: 12995
        };
    }

    // Convert array to object
    const prices = data.reduce((acc, item) => {
        // Map DB keys to frontend keys if needed, or just use DB keys
        // Frontend uses: inbox, ai. 
        // Corporate keys: uppypro_corporate_small -> corporate_small? 
        // Let's keep consistent with frontend components.
        // Assuming frontend will be updated to use 'uppypro_corporate_small' or we map here.
        // For now, mapping simple keys.

        if (item.product_key === 'base_inbox' || item.product_key === 'inbox') acc['inbox'] = item.monthly_price_try;
        else if (item.product_key === 'uppypro_ai') acc['ai'] = item.monthly_price_try;
        else acc[item.product_key] = item.monthly_price_try;

        return acc;
    }, {} as Record<string, number>);

    return prices;
}
