"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

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
        .select("id, status, current_period_end")
        .eq("tenant_id", member.tenant_id)
        .eq("status", "active")
        .single();

    if (!subscription) {
        return { error: "İptal edilecek aktif bir abonelik bulunamadı." };
    }

    // Güncelleme: İptali planla
    const { error } = await adminDb
        .from("subscriptions")
        .update({
            cancel_at_period_end: true,
            cancellation_scheduled_at: new Date().toISOString(),
            cancel_reason: reason,
            cancel_reason_details: details,
            // Status hala 'active' kalır, sadece flag değişir.
            // Cron job veya Iyzico webhook süresi dolunca 'canceled' yapacak.
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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Yetkilendirme hatası." };
    }

    const adminDb = createAdminClient();

    const { data: member } = await adminDb
        .from("tenant_members")
        .select("tenant_id, role")
        .eq("user_id", user.id)
        .single();

    if (!member || (member.role !== 'owner' && member.role !== 'admin' && member.role !== 'tenant_owner')) {
        return { error: "Bu işlem için yetkiniz yok." };
    }

    // İptali planlanmış aboneliği bul
    const { data: subscription } = await adminDb
        .from("subscriptions")
        .select("id")
        .eq("tenant_id", member.tenant_id)
        .eq("status", "active")
        .eq("cancel_at_period_end", true)
        .single();

    if (!subscription) {
        return { error: "Geri alınacak bir iptal işlemi bulunamadı." };
    }

    // Güncelleme: İptali geri al
    const { error } = await adminDb
        .from("subscriptions")
        .update({
            cancel_at_period_end: false,
            cancellation_scheduled_at: null,
            cancel_reason: null,
            cancel_reason_details: null
        })
        .eq("id", subscription.id);

    if (error) {
        console.error("Undo Cancel Error:", error);
        return { error: `İptal işlemi geri alınırken bir hata oluştu: ${error.message}` };
    }

    revalidatePath("/panel/settings");
    return { success: true };
}
