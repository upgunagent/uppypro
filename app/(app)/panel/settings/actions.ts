'use server';

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { resend, EMAIL_FROM } from "@/lib/resend";

export async function updateAiSettings(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "User not found" };

    const { data: member } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", user.id)
        .single();

    if (!member) return { error: "Tenant not found" };

    // Check permissions
    const { data: memberData } = await supabase
        .from("tenant_members")
        .select("role")
        .eq("tenant_id", member.tenant_id)
        .eq("user_id", user.id)
        .single();

    if (!memberData || !['tenant_owner', 'agency_admin', 'tenant_agent'].includes(memberData.role)) {
        // Agents might need to update this too? usually owners. Let's start with owners/admins.
        if (memberData?.role !== 'tenant_owner' && memberData?.role !== 'agency_admin') {
            return { error: "Bu işlemi yapmaya yetkiniz yok." };
        }
    }

    const systemMessage = formData.get("systemMessage") as string;
    const aiOperationalEnabled = formData.get("aiOperationalEnabled") === "true";

    const adminDb = createAdminClient();

    const { data: existingSettings } = await adminDb.from("agent_settings").select("ai_mode, ai_operational_enabled").eq("tenant_id", member.tenant_id).maybeSingle();

    const updates: any = {
        tenant_id: member.tenant_id,
        system_message: systemMessage,
        ai_operational_enabled: aiOperationalEnabled,
    };

    if (aiOperationalEnabled && (!existingSettings?.ai_mode || existingSettings?.ai_mode === 'disabled')) {
        updates.ai_mode = 'built_in';
    }

    // Update agent settings
    const { error } = await adminDb.from("agent_settings").upsert(updates, { onConflict: 'tenant_id' });

    if (error) {
        console.error("Error updating agent settings:", error);
        return { error: "Failed to update AI settings" };
    }

    // Trendyol bağlıysa ve sistem mesajında Trendyol bloğu yoksa otomatik ekle
    if (systemMessage?.trim()) {
        const { data: trendyolConn } = await adminDb
            .from("channel_connections")
            .select("status")
            .eq("tenant_id", member.tenant_id)
            .eq("channel", "trendyol")
            .maybeSingle();

        if (trendyolConn?.status === "connected" && !systemMessage.includes("### TRENDYOL MAĞAZA YÖNETİMİ")) {
            const { injectTrendyolToolsToSystemMessage } = await import("@/lib/trendyol/system-message-inject");
            await injectTrendyolToolsToSystemMessage(member.tenant_id);
        }
    }

    // Admin bilgilendirme e-postası
    try {
        const { data: profile } = await adminDb
            .from("profiles")
            .select("full_name, phone")
            .eq("user_id", user.id)
            .maybeSingle();

        const { data: tenant } = await adminDb
            .from("tenants")
            .select("name")
            .eq("id", member.tenant_id)
            .maybeSingle();

        const { data: billingInfo } = await adminDb
            .from("billing_info")
            .select("contact_email, contact_phone")
            .eq("tenant_id", member.tenant_id)
            .maybeSingle();

        const ownerName = profile?.full_name || user.email || "Bilinmiyor";
        const businessName = tenant?.name || "Bilinmiyor";
        const businessEmail = billingInfo?.contact_email || user.email || "—";
        const businessPhone = billingInfo?.contact_phone || profile?.phone || "—";
        const savedAt = new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });

        await resend.emails.send({
            from: EMAIL_FROM,
            to: "info@upgunai.com",
            subject: `⚡ AI Asistan Aktivasyon Gerekli: ${businessName}`,
            html: `
                <div style="font-family:sans-serif;background:#f8fafc;padding:24px;">
                <div style="max-width:620px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                <div style="background:linear-gradient(135deg,#6d28d9 0%,#4f46e5 100%);padding:24px 28px;">
                    <h1 style="color:white;margin:0;font-size:20px;font-weight:700;">⚡ AI Asistan Aktivasyon Talebi</h1>
                    <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">Bir üye sistem mesajını güncelledi — n8n üzerinde 48 saat içinde aktif edilmesi gerekiyor.</p>
                </div>
                <div style="padding:28px;">
                    <div style="background:#fef3c7;border:1px solid #fde68a;border-left:4px solid #f59e0b;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
                    <strong style="color:#92400e;font-size:14px;">⏰ Aksiyon Gerekli</strong>
                    <p style="color:#78350f;font-size:13px;margin:4px 0 0;">Bu üyenin AI asistanı n8n üzerinde en geç <strong>48 saat</strong> içinde aktif hale getirilmelidir.</p>
                    </div>
                    <h2 style="color:#1e293b;font-size:15px;font-weight:700;margin:0 0 12px;border-bottom:1px solid #f1f5f9;padding-bottom:8px;">👤 Hesap Sahibi</h2>
                    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                    <tr><td style="padding:8px 0;color:#64748b;font-size:13px;width:150px;">Ad Soyad</td><td style="padding:8px 0;color:#0f172a;font-weight:600;font-size:14px;">${ownerName}</td></tr>
                    <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">E-posta</td><td style="padding:8px 0;font-size:14px;"><a href="mailto:${user.email}" style="color:#6d28d9;">${user.email}</a></td></tr>
                    </table>
                    <h2 style="color:#1e293b;font-size:15px;font-weight:700;margin:0 0 12px;border-bottom:1px solid #f1f5f9;padding-bottom:8px;">🏢 İşletme Bilgileri</h2>
                    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                    <tr><td style="padding:8px 0;color:#64748b;font-size:13px;width:150px;">İşletme Adı</td><td style="padding:8px 0;color:#0f172a;font-weight:600;font-size:14px;">${businessName}</td></tr>
                    <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">E-posta</td><td style="padding:8px 0;font-size:14px;"><a href="mailto:${businessEmail}" style="color:#6d28d9;">${businessEmail}</a></td></tr>
                    <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Telefon</td><td style="padding:8px 0;font-size:14px;"><a href="tel:${businessPhone}" style="color:#6d28d9;">${businessPhone}</a></td></tr>
                    <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Tenant ID</td><td style="padding:8px 0;color:#94a3b8;font-size:12px;font-family:monospace;">${member.tenant_id}</td></tr>
                    </table>
                    <h2 style="color:#1e293b;font-size:15px;font-weight:700;margin:0 0 12px;border-bottom:1px solid #f1f5f9;padding-bottom:8px;">🤖 Sistem Mesajı &amp; Firma Bilgi Tabanı</h2>
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #6d28d9;border-radius:8px;padding:16px;font-size:13px;color:#334155;white-space:pre-wrap;line-height:1.7;">${systemMessage}</div>
                </div>
                <div style="background:#f8fafc;padding:16px 28px;text-align:center;border-top:1px solid #f1f5f9;">
                    <p style="color:#94a3b8;font-size:11px;margin:0;">UppyPro Panel — AI Asistan Ayarları • ${savedAt}</p>
                </div>
                </div></div>
            `,
        });
    } catch (emailErr) {
        console.error("[AI Settings] Admin bildirim maili gönderilemedi:", emailErr);
    }

    revalidatePath("/panel/settings");
    return { success: true };
}

export async function updateBillingInfo(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error("updateBillingInfo: User not found");
        return { error: "User not found" };
    }

    const { data: member, error: memberError } = await supabase
        .from("tenant_members")
        .select("tenant_id, role")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

    if (memberError || !member) {
        console.error("updateBillingInfo: Tenant not found or error", memberError);
        return { error: "Tenant not found" };
    }

    console.log("updateBillingInfo: Found tenant", member.tenant_id, "Role:", member.role);

    // Check permissions
    if (!['tenant_owner', 'agency_admin'].includes(member.role)) {
        return { error: "Bu işlemi yapmaya yetkiniz yok." };
    }

    const billingType = formData.get("billingType") as "company" | "individual";

    const data: any = {
        tenant_id: member.tenant_id,
        billing_type: billingType,
        contact_email: formData.get("contactEmail"),
        contact_phone: formData.get("contactPhone"),
        address_city: formData.get("city"),
        address_district: formData.get("district"),
        address_full: formData.get("addressFull"),
    };

    if (billingType === 'company') {
        data.company_name = formData.get("companyName");
        data.tax_office = formData.get("taxOffice");
        data.tax_number = formData.get("taxNumber");
        data.full_name = formData.get("authorizedPerson");
        // Clear individual fields if switching types
        data.tckn = null;
    } else {
        data.full_name = formData.get("fullName");
        data.tckn = formData.get("tckn");
        // Clear company fields
        data.company_name = null;
        data.tax_office = null;
        data.tax_number = null;
    }

    console.log("updateBillingInfo: Upserting data", data);

    // Use Admin Client to bypass RLS issues
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin.from("billing_info").upsert(data, { onConflict: 'tenant_id' });

    if (error) {
        console.error("Error updating billing info:", error);
        return { error: "Failed to update billing info: " + error.message };
    }

    console.log("updateBillingInfo: Success");

    revalidatePath("/panel/settings");
    revalidatePath(`/admin/tenants/${member.tenant_id}`); // Revalidate admin path too

    return { success: true };
}

export async function addPaymentMethod(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "User not found" };

    const { data: member } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", user.id)
        .single();

    if (!member) return { error: "Tenant not found" };

    const cardHolder = formData.get("cardHolder");
    const cardNumber = formData.get("cardNumber") as string;

    // MOCK: Adding a card (In reality, this would go to Iyzico/Stripe and get a token)
    // We just simulate saving a masked card
    const lastFour = cardNumber.slice(-4);

    const { error } = await supabase.from("payment_methods").insert({
        tenant_id: member.tenant_id,
        provider: 'mock_provider',
        card_alias: 'card_mock_token_' + Math.random().toString(36).substring(7),
        last_four: lastFour,
        card_family: 'MasterCard',
        card_association: 'Bonus',
        is_default: true // Making it default for now
    });

    if (error) {
        console.error("Error adding payment method:", error);
        return { error: "Failed to add payment method" };
    }

    revalidatePath("/panel/settings");
    return { success: true };
}

export async function deletePaymentMethod(id: string) {
    const supabase = await createClient();
    // Auth check implied in RLS but good to have context
    const { error } = await supabase.from("payment_methods").delete().eq("id", id);
    if (error) return { error: "Failed" };
    revalidatePath("/panel/settings");
    return { success: true };
}
