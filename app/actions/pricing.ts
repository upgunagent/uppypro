'use server';

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { createPricingPlan } from "@/lib/iyzico";

export async function updatePricing(
    productKey: string,
    priceTry: number,
    iyzicoCode: string,
    iyzicoProductCode?: string
) {
    const admin = createAdminClient();

    // 0. Mevcut kaydı çek (fiyat değişimi kontrolü için)
    const { data: currentRow } = await admin
        .from('pricing')
        .select('monthly_price_try, iyzico_pricing_plan_reference_code')
        .eq('product_key', productKey)
        .eq('billing_cycle', 'monthly')
        .maybeSingle();

    let finalIyzicoPlanCode = iyzicoCode;
    let iyzicoSyncMessage = '';

    // Fiyat değiştiyse ve İyzico ürün ref kodu varsa → İyzico'da yeni plan oluştur
    const priceChanged = currentRow && currentRow.monthly_price_try !== priceTry;
    
    console.log(`[PRICING] Debug: productKey=${productKey}, priceTry=${priceTry}, currentPrice=${currentRow?.monthly_price_try}, priceChanged=${priceChanged}, iyzicoProductCode=${iyzicoProductCode || 'EMPTY'}`);
    
    if (priceChanged && iyzicoProductCode) {
        try {
            const kdvDahilFiyat = priceTry * 1.20; // %20 KDV ekle
            console.log(`[PRICING] Fiyat değişti (${currentRow.monthly_price_try} → ${priceTry}). İyzico'da yeni plan oluşturuluyor... (KDV dahil: ${kdvDahilFiyat.toFixed(2)} TL)`);
            
            const planResult = await createPricingPlan({
                productReferenceCode: iyzicoProductCode,
                name: `${productKey} ${kdvDahilFiyat.toFixed(0)} TL Aylik`,
                price: kdvDahilFiyat,
                currencyCode: 'TRY',
                paymentInterval: 'MONTHLY',
                paymentIntervalCount: 1,
                planPaymentType: 'RECURRING'
            });

            if (planResult.status === 'success' && planResult.referenceCode) {
                finalIyzicoPlanCode = planResult.referenceCode;
                iyzicoSyncMessage = ` | İyzico yeni plan: ${finalIyzicoPlanCode} (${kdvDahilFiyat.toFixed(0)} TL)`;
                console.log(`[PRICING] İyzico'da yeni plan oluşturuldu: ${finalIyzicoPlanCode}`);
            } else {
                iyzicoSyncMessage = ` | İyzico HATA: ${planResult.errorMessage || 'Bilinmeyen hata'}`;
                console.error(`[PRICING] İyzico plan oluşturulamadı:`, planResult.errorMessage, planResult.errorDetails);
            }
        } catch (e: any) {
            iyzicoSyncMessage = ` | İyzico Exception: ${e.message}`;
            console.error('[PRICING] İyzico senkronizasyon hatası:', e);
        }
    } else if (!priceChanged) {
        iyzicoSyncMessage = ' | Fiyat değişmedi, İyzico güncellenmedi.';
    } else if (!iyzicoProductCode) {
        iyzicoSyncMessage = ' | Ürün ref kodu boş, İyzico güncellenmedi!';
    }

    // 1. pricing tablosunu güncelle (plan ref kodu + fiyat)
    const { error } = await admin
        .from('pricing')
        .update({
            monthly_price_try: priceTry,
            iyzico_pricing_plan_reference_code: finalIyzicoPlanCode || null
        })
        .eq('product_key', productKey)
        .eq('billing_cycle', 'monthly');

    if (error) {
        return { error: error.message + iyzicoSyncMessage };
    }

    // 2. Ürün ref kodu varsa products tablosunu da güncelle
    if (iyzicoProductCode !== undefined) {
        await admin
            .from('products')
            .update({ iyzico_product_reference_code: iyzicoProductCode || null })
            .eq('key', productKey);
    }

    revalidatePath('/');
    revalidatePath('/panel/settings');
    revalidatePath('/admin/pricing');

    return { success: true, message: 'Fiyat güncellendi.' + iyzicoSyncMessage };
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
            inbox: 995,
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
