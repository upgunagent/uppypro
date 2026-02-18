"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
    cancelSubscription as iyzicoCancel,
    updateSubscriptionCard as iyzicoUpdateCard,
    upgradeSubscription as iyzicoUpgrade,
    retrySubscription as iyzicoRetry
} from "@/lib/iyzico";

/**
 * Initialize Card Update Checkout Form
 */
export async function initializeCardUpdate() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Oturum açmanız gerekiyor." };
    }

    const adminDb = createAdminClient();

    // Find Tenant
    const { data: member } = await adminDb
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", user.id)
        .single();

    if (!member) {
        return { error: "İşletme kaydı bulunamadı." };
    }

    // Find Active Subscription
    const { data: subscription } = await adminDb
        .from("subscriptions")
        .select("*")
        .eq("tenant_id", member.tenant_id)
        .eq("status", "active")
        .single();

    if (!subscription || !subscription.iyzico_subscription_reference_code) {
        return { error: "Aktif bir abonelik bulunamadı." };
    }

    try {
        const result = await iyzicoUpdateCard({
            subscriptionReferenceCode: subscription.iyzico_subscription_reference_code,
            customerReferenceCode: subscription.iyzico_customer_reference_code || "", // Fallback empty if missing, though it should exist
            callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/iyzico-card-update-callback`
        });

        if (result.status !== 'success') {
            return { error: result.errorMessage || "Kart güncelleme başlatılamadı." };
        }

        return {
            checkoutFormContent: result.checkoutFormContent,
            token: result.token
        };

    } catch (e: any) {
        console.error("Card Update Init Error:", e);
        return { error: "Sistem hatası: " + e.message };
    }
}

/**
 * Cancel Subscription
 */
export async function cancelUserSubscription(reason: string, details?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Yetkilendirme hatası." };

    const adminDb = createAdminClient();

    const { data: member } = await adminDb
        .from("tenant_members")
        .select("tenant_id, role")
        .eq("user_id", user.id)
        .single();

    if (!member || (member.role !== 'owner' && member.role !== 'admin' && member.role !== 'tenant_owner')) {
        return { error: "Bu işlem için yetkiniz yok." };
    }

    const { data: subscription } = await adminDb
        .from("subscriptions")
        .select("id, status, iyzico_subscription_reference_code")
        .eq("tenant_id", member.tenant_id)
        .in("status", ["active", "past_due"]) // Allow canceling past_due as well
        .single();

    if (!subscription) {
        return { error: "İptal edilecek abonelik bulunamadı." };
    }

    // Call Iyzico
    if (subscription.iyzico_subscription_reference_code) {
        try {
            const result = await iyzicoCancel(subscription.iyzico_subscription_reference_code);
            if (result.status !== 'success') {
                return { error: "Iyzico iptal hatası: " + result.errorMessage };
            }
        } catch (e: any) {
            console.error("Iyzico Cancel Error:", e);
            return { error: "Ödeme sağlayıcı hatası: " + e.message };
        }
    }

    // Update DB
    const { error } = await adminDb
        .from("subscriptions")
        .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            cancel_reason: reason,
            cancel_reason_details: details
        })
        .eq("id", subscription.id);

    if (error) {
        return { error: "Abonelik iptal edildi ancak veritabanı güncellenemedi." };
    }

    revalidatePath("/panel/settings");
    return { success: true };
}

/**
 * Retry Payment
 */
export async function retryUserPayment() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Yetkilendirme hatası." };

    const adminDb = createAdminClient();
    const { data: member } = await adminDb
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", user.id)
        .single();

    if (!member) return { error: "İşletme bulunamadı." };

    const { data: subscription } = await adminDb
        .from("subscriptions")
        .select("iyzico_subscription_reference_code, status")
        .eq("tenant_id", member.tenant_id)
        .single();

    if (!subscription || !subscription.iyzico_subscription_reference_code) {
        return { error: "Abonelik bulunamadı." };
    }

    try {
        const result = await iyzicoRetry(subscription.iyzico_subscription_reference_code);

        if (result.status !== 'success') {
            return { error: result.errorMessage || "Ödeme tekrar denemesi başarısız." };
        }

        // If successful, Iyzico might trigger webhook? 
        // Or we assume it worked and maybe refresh status? 
        // Usually 'retry' just triggers the attempt. The status update comes via webhook mostly.
        // But if result says success, the operation is queued or done.

        return { success: true, message: "Ödeme çekimi talimatı verildi." };

    } catch (e: any) {
        console.error("Retry Error:", e);
        return { error: "İşlem sırasında hata: " + e.message };
    }
}

/**
 * Change Plan (Upgrade/Downgrade)
 */
export async function changeUserPlan(newProductKey: 'uppypro_inbox' | 'uppypro_ai') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Yetkilendirme hatası." };

    const adminDb = createAdminClient();
    const { data: member } = await adminDb
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", user.id)
        .single();

    if (!member) return { error: "İşletme bulunamadı." };

    // 1. Get Current Subscription
    const { data: subscription } = await adminDb
        .from("subscriptions")
        .select("*")
        .eq("tenant_id", member.tenant_id)
        .eq("status", "active")
        .single();

    if (!subscription || !subscription.iyzico_subscription_reference_code) {
        return { error: "Aktif abonelik bulunamadı." };
    }

    const currentKey = subscription.ai_product_key || 'uppypro_inbox';
    if (currentKey === newProductKey) {
        return { error: "Zaten bu pakettesiniz." };
    }

    // 2. Find New Pricing Plan Code
    // Assuming 'monthly' for now as we don't support yearly switch in UI yet
    const { data: price } = await adminDb
        .from("pricing")
        .select("iyzico_pricing_plan_reference_code")
        .eq("product_key", newProductKey)
        .eq("billing_cycle", "monthly")
        .single();

    if (!price || !price.iyzico_pricing_plan_reference_code) {
        return { error: "Yeni paket fiyat bilgisi bulunamadı." };
    }

    // 3. Call Iyzico Upgrade
    try {
        const result = await iyzicoUpgrade(
            subscription.iyzico_subscription_reference_code,
            price.iyzico_pricing_plan_reference_code
        );

        if (result.status !== 'success') {
            return { error: result.errorMessage || "Paket değişikliği başarısız." };
        }

        // 4. Update DB
        // Iyzico handles the pro-rata charge/refund logic? 
        // Docs say: "Upgrade/Downgrade operation calculates difference..."
        // We update our local ref to the new plan? 
        // Actually our product key tracks the features.

        await adminDb.from("subscriptions")
            .update({
                ai_product_key: newProductKey,
                updated_at: new Date().toISOString()
                // Do we need to update pricing_plan_ref in DB? 
                // We don't strictly store it in subscription table usually, 
                // but if we did, we should update it. 
                // Based on schema, we have `ai_product_key`.
            })
            .eq("id", subscription.id);

        revalidatePath("/panel/settings");
        return { success: true };

    } catch (e: any) {
        console.error("Upgrade Error:", e);
        return { error: "Sistem hatası: " + e.message };
    }
}
