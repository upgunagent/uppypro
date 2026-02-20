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

    if (!subscription) {
        return { error: "Aktif bir abonelik bulunamadı." };
    }

    // SELF-HEALING: If reference code is missing but we have a token (e.g. callback failed)
    if (!subscription.iyzico_subscription_reference_code && subscription.iyzico_checkout_token) {
        console.log(`[SELF-HEALING] Attempting recovery for sub ${subscription.id} with token ${subscription.iyzico_checkout_token}`);
        try {
            const { getSubscriptionCheckoutFormResult } = await import("@/lib/iyzico");
            const result = await getSubscriptionCheckoutFormResult(subscription.iyzico_checkout_token);
            console.log(`[SELF-HEALING] Iyzico Result:`, JSON.stringify(result));

            const subRefCode = result.subscriptionReferenceCode || result.referenceCode;

            if (result.status === 'success' && subRefCode) {
                // Update DB immediately
                await adminDb.from("subscriptions")
                    .update({
                        iyzico_subscription_reference_code: subRefCode,
                        iyzico_customer_reference_code: result.customerReferenceCode,
                        status: 'active' // Ensure it's active
                    })
                    .eq("id", subscription.id);

                // Update local variable
                subscription.iyzico_subscription_reference_code = subRefCode;
                subscription.iyzico_customer_reference_code = result.customerReferenceCode;
                console.log(`[SELF-HEALING] Recovery Successful: ${subRefCode}`);
            } else {
                console.error(`[SELF-HEALING] Recovery Failed. Status: ${result.status}, RefCode: ${result.subscriptionReferenceCode}, Error: ${result.errorMessage}`);
            }
        } catch (e) {
            console.error("Self-healing failed:", e);
        }
    } else {
        console.log(`[SELF-HEALING] Skipped. RefCode: ${subscription.iyzico_subscription_reference_code}, Token: ${subscription.iyzico_checkout_token}`);
    }

    if (!subscription.iyzico_subscription_reference_code) {
        let debugInfo = `Token: ${!!subscription.iyzico_checkout_token}`;
        // If recovery ran, we might have logs but can't see them.
        // Let's rely on what we can infer or if we can pass the last error up? 
        // We can'teasily. 
        // But we can check if we have a token and if we are here, it failed.

        return { error: `Abonelik referans kodu bulunamadı. (Recovery Failed). Destek için bu kodu iletin: [SUB-ID: ${subscription.id}] [TOKEN-EXISTS: ${!!subscription.iyzico_checkout_token}]` };
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

        // Save Token for Callback Identification
        await adminDb.from("subscriptions")
            .update({
                iyzico_checkout_token: result.token,
                updated_at: new Date().toISOString()
            })
            .eq("id", subscription.id);

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
        .select("id, status, iyzico_subscription_reference_code, iyzico_checkout_token")
        .eq("tenant_id", member.tenant_id)
        .in("status", ["active", "past_due"]) // Allow canceling past_due as well
        .single();

    if (!subscription) {
        return { error: "İptal edilecek abonelik bulunamadı." };
    }

    // SELF-HEALING
    if (!subscription.iyzico_subscription_reference_code && subscription.iyzico_checkout_token) {
        try {
            const { getSubscriptionCheckoutFormResult } = await import("@/lib/iyzico");
            const result = await getSubscriptionCheckoutFormResult(subscription.iyzico_checkout_token);
            const subRefCode = result.subscriptionReferenceCode || result.referenceCode;

            if (result.status === 'success' && subRefCode) {
                await adminDb.from("subscriptions")
                    .update({
                        iyzico_subscription_reference_code: subRefCode,
                        iyzico_customer_reference_code: result.customerReferenceCode,
                        status: 'active'
                    })
                    .eq("id", subscription.id);
                subscription.iyzico_subscription_reference_code = subRefCode;
            }
        } catch (e) { console.error("Self-healing failed:", e); }
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
        .select("id, iyzico_subscription_reference_code, status, iyzico_checkout_token")
        .eq("tenant_id", member.tenant_id)
        .single();

    if (!subscription) {
        return { error: "Abonelik bulunamadı." };
    }

    // SELF-HEALING
    if (!subscription.iyzico_subscription_reference_code && subscription.iyzico_checkout_token) {
        try {
            const { getSubscriptionCheckoutFormResult } = await import("@/lib/iyzico");
            const result = await getSubscriptionCheckoutFormResult(subscription.iyzico_checkout_token);
            const subRefCode = result.subscriptionReferenceCode || result.referenceCode;

            if (result.status === 'success' && subRefCode) {
                await adminDb.from("subscriptions")
                    .update({
                        iyzico_subscription_reference_code: subRefCode,
                        iyzico_customer_reference_code: result.customerReferenceCode,
                        status: 'active'
                    })
                    .eq("id", subscription.id);
                subscription.iyzico_subscription_reference_code = subRefCode;
            }
        } catch (e) { console.error("Self-healing failed:", e); }
    }

    if (!subscription.iyzico_subscription_reference_code) {
        return { error: "Abonelik referans kodu bulunamadı." };
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
// Updated Type Signature to allow string for generic plan upgrade
export async function changeUserPlan(newProductKey: string) {
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

    if (!subscription) {
        return { error: "Aktif abonelik bulunamadı." };
    }

    // SELF-HEALING (Kept as is)
    if (!subscription.iyzico_subscription_reference_code && subscription.iyzico_checkout_token) {
        try {
            const { getSubscriptionCheckoutFormResult } = await import("@/lib/iyzico");
            const result = await getSubscriptionCheckoutFormResult(subscription.iyzico_checkout_token);
            const subRefCode = result.subscriptionReferenceCode || result.referenceCode;

            if (result.status === 'success' && subRefCode) {
                await adminDb.from("subscriptions")
                    .update({
                        iyzico_subscription_reference_code: subRefCode,
                        iyzico_customer_reference_code: result.customerReferenceCode,
                        status: 'active'
                    })
                    .eq("id", subscription.id);
                subscription.iyzico_subscription_reference_code = subRefCode;
            }
        } catch (e) { console.error("Self-healing failed:", e); }
    }

    if (!subscription.iyzico_subscription_reference_code) {
        return { error: "Aktif abonelik bulunamadı (Ref Code Missing)." };
    }

    const currentKey = subscription.ai_product_key || subscription.base_product_key || 'inbox'; // Fallback
    if (currentKey === newProductKey) {
        return { error: "Zaten bu pakettesiniz." };
    }

    // 2. Find New Pricing Plan Code
    const { data: price } = await adminDb
        .from("pricing")
        .select("iyzico_pricing_plan_reference_code, product_key") // Select product_key to verify
        .eq("product_key", newProductKey)
        .eq("billing_cycle", "monthly")
        .single();

    if (!price || !price.iyzico_pricing_plan_reference_code) {
        return { error: "Yeni paket fiyat veya referans kodu bulunamadı." };
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
        // We update ai_product_key if it's an AI plan, or base_product_key if it's base.
        // For now, our architecture treats everything as 'ai_product_key' effectively for upgrades or we need logic.
        // Assuming 'inbox' is base, others are 'ai' features or higher tiers.
        // BUT logic suggests we mostly upgrade tiers.
        // Let's simply update `ai_product_key` as that seems to be the main driver for feature flags in this app context.
        // If it's a corporate plan, it replaces the current plan.

        await adminDb.from("subscriptions")
            .update({
                ai_product_key: newProductKey,
                updated_at: new Date().toISOString()
            })
            .eq("id", subscription.id);

        revalidatePath("/panel/settings");
        return { success: true };

    } catch (e: any) {
        console.error("Upgrade Error:", e);
        return { error: "Sistem hatası: " + e.message };
    }
}

/**
 * Reactivate Subscription (for canceled subscriptions)
 * Creates a new Iyzico checkout form to start a fresh subscription.
 */
export async function reactivateUserSubscription(selectedProductKey: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Yetkilendirme hatası." };

    const adminDb = createAdminClient();

    // 1. Find Tenant
    const { data: member } = await adminDb
        .from("tenant_members")
        .select("tenant_id, role")
        .eq("user_id", user.id)
        .single();

    if (!member || (member.role !== 'owner' && member.role !== 'admin' && member.role !== 'tenant_owner')) {
        return { error: "Bu işlem için yetkiniz yok." };
    }

    // 2. Find Canceled Subscription
    const { data: subscription } = await adminDb
        .from("subscriptions")
        .select("*")
        .eq("tenant_id", member.tenant_id)
        .eq("status", "canceled")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!subscription) {
        return { error: "İptal edilmiş abonelik bulunamadı." };
    }

    // 3. Find Pricing Plan Reference Code for Selected Product
    const { data: price } = await adminDb
        .from("pricing")
        .select("iyzico_pricing_plan_reference_code, product_key, monthly_price_try")
        .eq("product_key", selectedProductKey)
        .eq("billing_cycle", "monthly")
        .single();

    if (!price || !price.iyzico_pricing_plan_reference_code) {
        return { error: "Seçilen paket için fiyat bilgisi bulunamadı." };
    }

    // 4. Get User Profile & Billing Info
    const [{ data: profile }, { data: billingInfo }] = await Promise.all([
        adminDb.from("profiles").select("*").eq("user_id", user.id).single(),
        adminDb.from("billing_info").select("*").eq("tenant_id", member.tenant_id).single()
    ]);

    const userName = profile?.full_name || billingInfo?.full_name || user.email?.split('@')[0] || 'Ad Soyad';
    const userPhone = profile?.phone || billingInfo?.contact_phone || '';
    const userAddress = billingInfo?.address_full || 'Adres belirtilmedi';

    // 5. Format Phone
    let cleanedPhone = (userPhone || '').replace(/\D/g, '');
    if (cleanedPhone.startsWith('0')) cleanedPhone = cleanedPhone.substring(1);
    if (!cleanedPhone.startsWith('90')) cleanedPhone = '90' + cleanedPhone;
    const gsmNumber = '+' + cleanedPhone;

    // 6. Initialize Iyzico Checkout
    try {
        const { initializeSubscriptionCheckout } = await import("@/lib/iyzico");

        const result = await initializeSubscriptionCheckout({
            conversationId: member.tenant_id,
            pricingPlanReferenceCode: price.iyzico_pricing_plan_reference_code,
            subscriptionInitialStatus: 'ACTIVE',
            callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/iyzico-callback-v2`,
            customer: {
                name: userName.split(' ')[0] || 'Ad',
                surname: userName.split(' ').slice(1).join(' ') || 'Soyad',
                email: user.email || '',
                gsmNumber: gsmNumber,
                identityNumber: billingInfo?.tckn || '11111111111',
                billingAddress: {
                    contactName: userName,
                    city: billingInfo?.address_city || 'Istanbul',
                    country: 'Turkey',
                    address: userAddress,
                    zipCode: billingInfo?.address_zip || '34000'
                },
                shippingAddress: {
                    contactName: userName,
                    city: billingInfo?.address_city || 'Istanbul',
                    country: 'Turkey',
                    address: userAddress,
                    zipCode: billingInfo?.address_zip || '34000'
                }
            }
        });

        if (result.status !== 'success') {
            console.error("[REACTIVATE] Iyzico Error:", result.errorMessage);
            return { error: `Ödeme formu başlatılamadı: ${result.errorMessage}` };
        }

        // 7. Save token to subscription for callback identification
        if (result.token) {
            await adminDb.from("subscriptions")
                .update({
                    iyzico_checkout_token: result.token,
                    ai_product_key: selectedProductKey,
                    updated_at: new Date().toISOString()
                })
                .eq("id", subscription.id);
        }

        return {
            checkoutFormContent: result.checkoutFormContent,
            token: result.token
        };

    } catch (e: any) {
        console.error("[REACTIVATE] Exception:", e);
        return { error: "Sistem hatası: " + e.message };
    }
}

