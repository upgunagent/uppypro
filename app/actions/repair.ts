"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function repairTenantAction() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Kullanıcı bulunamadı" };

    const admin = createAdminClient();

    try {
        console.log("Manuel Onarım Başlatıldı:", user.email);

        // 1. Check if ANY tenant exists for this user (double check)
        const { data: existingMember } = await admin
            .from("tenant_members")
            .select("tenant_id")
            .eq("user_id", user.id)
            .single();

        if (existingMember) {
            return { success: true, message: "Zaten bir işletmeniz var." };
        }

        // 2. Create Tenant
        // Use user's name or email as company name fallback
        const companyName = user.user_metadata.full_name || "İşletmem";

        const { data: newTenant, error: tenantError } = await admin
            .from("tenants")
            .insert({ name: companyName })
            .select()
            .single();

        if (tenantError || !newTenant) throw tenantError || new Error("Tenant creation failed");

        // 3. Link User
        await admin.from("tenant_members").insert({
            tenant_id: newTenant.id,
            user_id: user.id,
            role: 'tenant_owner'
        });

        // 4. Add Demo Data
        // Conversation
        const { data: conv } = await admin.from("conversations").insert({
            tenant_id: newTenant.id,
            channel: 'whatsapp',
            external_thread_id: '905329998877',
            customer_handle: 'Ahmet Yılmaz (Demo)',
            mode: 'HUMAN'
        }).select().single();

        if (conv) {
            // Message
            await admin.from("messages").insert({
                tenant_id: newTenant.id,
                conversation_id: conv.id,
                direction: 'IN',
                sender: 'CUSTOMER',
                text: 'Merhaba, sisteminiz hakkında bilgi alabilir miyim?'
            });
        }

        // Connection
        await admin.from("channel_connections").insert({
            tenant_id: newTenant.id,
            channel: 'whatsapp',
            status: 'connected',
            meta_identifiers: { "display_number": "+90 532 999 88 77" }
        });

        revalidatePath("/", "layout"); // Refresh everything
        return { success: true };

    } catch (error: any) {
        console.error("Repair Error:", error);
        return { success: false, error: error.message };
    }
}
