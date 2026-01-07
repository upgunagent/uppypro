"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateAiSettings(tenantId: string, formData: FormData) {
    const supabase = await createClient();

    // Verify Agency Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Yetkisiz Erişim");

    // Check if user has agency_admin role in ANY tenant (or specific logic)
    // Using .maybeSingle() or checking list to avoid "Multiple rows" error if user is in multiple tenants
    const { data: members } = await supabase
        .from("tenant_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "agency_admin");

    // Strict check: Must have at least one agency_admin record
    if (!members || members.length === 0) {
        throw new Error("Yetkisiz Erişim: Sadece Ajans Yöneticileri AI ayarlarını değiştirebilir");
    }

    const n8nUrl = formData.get("n8n_webhook_url") as string;
    const operational = formData.get("ai_operational_enabled") === "on";

    // Use Admin Client for the write operation to bypass RLS
    const adminDb = createAdminClient();

    const { error } = await adminDb
        .from("agent_settings")
        .upsert({
            tenant_id: tenantId,
            n8n_webhook_url: n8nUrl,
            ai_operational_enabled: operational
        });

    if (error) {
        console.error("Update AI Settings Error:", error);
        throw new Error(error.message);
    }

    revalidatePath(`/admin/tenants/${tenantId}/ai`);
}
