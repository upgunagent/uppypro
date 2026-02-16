"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { cancelSubscription as iyzicoCancel, updateSubscriptionCard as iyzicoUpdateCard } from "@/lib/iyzico";

export async function cancelSubscription(reason: string, details?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Yetkilendirme hatası." };
    }

    const adminDb = createAdminClient();

    // Kullanıcının tenant_id'sini bul (Admin Client ile)
    const { data: member } = await adminDb
        .from("tenant_members")
        .select("tenant_id, role")
        .eq("user_id", user.id)
        .single();

    if (!member || (member.role !== 'owner' && member.role !== 'admin' && member.role !== 'tenant_owner')) {
        return { error: "Bu işlem için yetkiniz yok. (Rolünüz: " + (member?.role || 'yok') + ")" };
    }

    // Aktif aboneliği bul
    const { data: subscription } = await adminDb
        .from("subscriptions")
        .select("id, status, current_period_end, iyzico_subscription_reference_code")
        .eq("tenant_id", member.tenant_id)
        .eq("status", "active")
        .single();

    if (!subscription) {
        return { error: "İptal edilecek aktif bir abonelik bulunamadı." };
    }

    // Iyzico İptali
    if (subscription.iyzico_subscription_reference_code) {
        try {
            const result = await iyzicoCancel(subscription.iyzico_subscription_reference_code);
            if (result.status !== 'success') {
                return { error: "Iyzico iptal işlemi başarısız: " + result.errorMessage };
            }
        } catch (e: any) {
            console.error("Iyzico Cancel Error:", e);
            return { error: "Ödeme sağlayıcı hatası: " + e.message };
        }
    }

    // Güncelleme: İptali planla / uygula
    // Iyzico anında iptal ettiği için durumu canceled yapabiliriz veya dönem sonuna kadar erişimi koruruz.
    // Erişim koruma mantığı: status active kalır, cancel_at_period_end true olur.
    // Ancak Iyzico tekrar çekim yapmayacak.
    const { error } = await adminDb
        .from("subscriptions")
        .update({
            cancel_at_period_end: true, // UI'da "İptal edildi, dönem sonuna kadar açık" göstermek için
            cancellation_scheduled_at: new Date().toISOString(),
            cancel_reason: reason,
            cancel_reason_details: details,
            // Iyzico tarafında iptal olduğu için bir daha çekim olmaz.
        })
        .eq("id", subscription.id);

    if (error) {
        console.error("Cancel Subscription Error:", error);
        return { error: `Abonelik iptal edilemedi: ${error.message} (${error.code})` };
    }

    revalidatePath("/panel/settings");
    return { success: true };
}

export async function undoCancelSubscription() {
    return { error: "Iyzico altyapısında iptal işlemi geri alınamaz. Lütfen abonelik süreniz bittiğinde tekrar abone olun." };
}

export async function initializeCardUpdate() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "User not found" };

    const adminDb = createAdminClient();
    const { data: member } = await adminDb.from("tenant_members").select("tenant_id").eq("user_id", user.id).single();
    if (!member) return { error: "Tenant not found" };

    const { data: subscription } = await adminDb
        .from("subscriptions")
        .select("iyzico_subscription_reference_code, iyzico_customer_reference_code")
        .eq("tenant_id", member.tenant_id)
        .eq("status", "active")
        .single();

    if (!subscription || !subscription.iyzico_subscription_reference_code) {
        return { error: "Aktif Iyzico aboneliği bulunamadı." };
    }

    try {
        const result = await iyzicoUpdateCard({
            subscriptionReferenceCode: subscription.iyzico_subscription_reference_code,
            customerReferenceCode: subscription.iyzico_customer_reference_code,
            callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/iyzico-card-update-callback`
        });

        if (result.status !== 'success') {
            return { error: result.errorMessage };
        }

        return { checkoutFormContent: result.checkoutFormContent };

    } catch (e: any) {
        console.error("Card Update Init Error:", e);
        return { error: e.message };
    }
}
