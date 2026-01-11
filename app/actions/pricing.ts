'use server';

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function updatePricing(productKey: string, priceTry: number) {
    const admin = createAdminClient();

    // priceTry received as normal number (e.g. 495), convert to cents (49500)
    const priceCents = Math.round(priceTry * 100);

    const { error } = await admin
        .from('pricing')
        .update({ monthly_price_try: priceCents })
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
