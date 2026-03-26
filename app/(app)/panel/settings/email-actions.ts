'use server';

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { testSmtpConnection } from "@/lib/ai/email-sender";

export async function updateEmailSettings(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "User not found" };

    const { data: member } = await supabase
        .from("tenant_members")
        .select("tenant_id, role")
        .eq("user_id", user.id)
        .single();

    if (!member) return { error: "Tenant not found" };
    if (!['tenant_owner', 'agency_admin'].includes(member.role)) {
        return { error: "Bu işlemi yapmaya yetkiniz yok." };
    }

    const smtpHost = formData.get("smtpHost") as string;
    const smtpPort = parseInt(formData.get("smtpPort") as string) || 587;
    const smtpUser = formData.get("smtpUser") as string;
    const smtpPass = formData.get("smtpPass") as string;
    const smtpFromName = formData.get("smtpFromName") as string;
    const smtpEnabled = formData.get("smtpEnabled") === "true";

    const adminDb = createAdminClient();

    // Fetch existing to preserve password if not changed
    const { data: existing } = await adminDb
        .from("email_settings")
        .select("smtp_pass_encrypted")
        .eq("tenant_id", member.tenant_id)
        .maybeSingle();

    const passToSave = smtpPass && smtpPass !== "••••••••"
        ? smtpPass
        : existing?.smtp_pass_encrypted || "";

    const { error } = await adminDb.from("email_settings").upsert({
        tenant_id: member.tenant_id,
        smtp_host: smtpHost || null,
        smtp_port: smtpPort,
        smtp_user: smtpUser || null,
        smtp_pass_encrypted: passToSave || null,
        smtp_from_name: smtpFromName || null,
        smtp_enabled: smtpEnabled,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id' });

    if (error) {
        console.error("Error updating email settings:", error);
        return { error: "E-posta ayarları kaydedilemedi: " + error.message };
    }

    revalidatePath("/panel/settings");
    return { success: true };
}

export async function testSmtpConnectionAction(formData: FormData) {
    const smtpHost = formData.get("smtpHost") as string;
    const smtpPort = parseInt(formData.get("smtpPort") as string) || 587;
    const smtpUser = formData.get("smtpUser") as string;
    const smtpPass = formData.get("smtpPass") as string;

    if (!smtpHost || !smtpUser || !smtpPass) {
        return { success: false, message: "Lütfen tüm alanları doldurun." };
    }

    // If password is masked, fetch real password
    let realPass = smtpPass;
    if (smtpPass === "••••••••") {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, message: "Oturum bulunamadı." };

        const { data: member } = await supabase
            .from("tenant_members")
            .select("tenant_id")
            .eq("user_id", user.id)
            .single();

        if (member) {
            const adminDb = createAdminClient();
            const { data: existing } = await adminDb
                .from("email_settings")
                .select("smtp_pass_encrypted")
                .eq("tenant_id", member.tenant_id)
                .maybeSingle();
            realPass = existing?.smtp_pass_encrypted || "";
        }
    }

    return await testSmtpConnection({
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_user: smtpUser,
        smtp_pass: realPass,
    });
}
