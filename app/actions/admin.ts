"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateAiSettings(tenantId: string, formData: FormData) {
    const supabase = await createClient();

    // Verify Agency Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Yetkisiz Erişim");

    const { data: member } = await supabase
        .from("tenant_members")
        .select("role")
        .eq("user_id", user.id)
        .single();

    // Strict check: Must be agency_admin
    if (member?.role !== "agency_admin") {
        // Allow tenant owner? Prompt said "Admin, müşteri için...".
        // "Admin Panel (ajans): ... AI ayarları (n8n webhook URL + AI aktif/pasif)"
        // So only agency admin.
        throw new Error("Yetkisiz Erişim: Sadece Ajans Yöneticileri AI ayarlarını değiştirebilir");
    }

    const n8nUrl = formData.get("n8n_webhook_url") as string;
    const operational = formData.get("ai_operational_enabled") === "on";

    const { error } = await supabase
        .from("agent_settings")
        .upsert({
            tenant_id: tenantId,
            n8n_webhook_url: n8nUrl,
            ai_operational_enabled: operational
        });

    if (error) throw new Error(error.message);

    revalidatePath(`/admin/tenants/${tenantId}/ai`);
}
