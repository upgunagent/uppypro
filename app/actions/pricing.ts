'use server';

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

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
