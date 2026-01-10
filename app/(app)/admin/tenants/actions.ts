"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function deleteTenant(tenantId: string) {
    const supabase = createAdminClient();

    try {
        // 1. Get all users associated with this tenant
        const { data: members, error: membersError } = await supabase
            .from("tenant_members")
            .select("user_id")
            .eq("tenant_id", tenantId);

        if (membersError) throw new Error("Üyeler alınamadı: " + membersError.message);

        const memberUserIds = members.map(m => m.user_id);

        // 2. Delete the tenant (cascades to subscriptions, billing, conversations, etc.)
        const { error: deleteError } = await supabase
            .from("tenants")
            .delete()
            .eq("id", tenantId);

        if (deleteError) throw new Error("İşletme silinemedi: " + deleteError.message);

        // 3. Check and delete orphaned users
        for (const userId of memberUserIds) {
            // Check if user belongs to any other tenant
            const { data: remainingMemberships } = await supabase
                .from("tenant_members")
                .select("id")
                .eq("user_id", userId)
                .maybeSingle();

            if (!remainingMemberships) {
                // User has no other tenants, safe to delete
                const { error: userDeleteError } = await supabase.auth.admin.deleteUser(userId);
                if (userDeleteError) {
                    console.error(`Failed to delete orphaned user ${userId}:`, userDeleteError);
                } else {
                    console.log(`Deleted orphaned user ${userId}`);
                }
            }
        }

        revalidatePath("/admin/tenants");
        return { success: true };
    } catch (error: any) {
        console.error("Delete tenant error:", error);
        return { success: false, error: error.message };
    }
}
