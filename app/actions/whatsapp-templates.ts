"use server";

import { createClient } from "@/lib/supabase/server";

export async function getWhatsAppTemplates(tenantId: string) {
    const supabase = await createClient();

    // Kullanıcının yetkisi var mı kontrol et
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: member } = await supabase
        .from("tenant_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("tenant_id", tenantId)
        .single();

    if (!member) return { success: false, error: "Not a member" };

    // Bağlantıyı bul
    const { data: connection, error: connError } = await supabase
        .from("channel_connections")
        .select("access_token_encrypted, meta_identifiers")
        .eq("tenant_id", tenantId)
        .eq("channel", "whatsapp")
        .eq("status", "connected")
        .single();

    if (connError || !connection) {
        return { success: false, error: "WhatsApp bağlantısı bulunamadı." };
    }

    const wabaId = (connection.meta_identifiers as any)?.waba_id;
    const accessToken = connection.access_token_encrypted;

    if (!wabaId || !accessToken) {
        return { success: false, error: "WhatsApp Business Account ID (WABA ID) veya Token eksik." };
    }

    try {
        const url = `https://graph.facebook.com/v19.0/${wabaId}/message_templates?limit=100`;
        const res = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            next: { revalidate: 0 } // Cache'leme, hep taze getir
        });

        const json = await res.json();

        if (json.error) {
            console.error("Meta Template Fetch Error:", json.error);
            return { success: false, error: json.error.message };
        }

        const templates = json.data || [];

        // DB'den şablonlara atanmış UppyPro medyalarını çek
        const { data: attachments } = await supabase
            .from("whatsapp_template_attachments")
            .select("template_name, language, file_url, file_type")
            .eq("tenant_id", tenantId);

        if (attachments && attachments.length > 0) {
            templates.forEach((tpl: any) => {
                const attached = attachments.find(a => a.template_name === tpl.name && a.language === tpl.language);
                if (attached) {
                    tpl.uppypro_media = attached;
                }
            });
        }

        return { success: true, data: templates };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function createWhatsAppTemplate(tenantId: string, payload: any) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: member } = await supabase
        .from("tenant_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("tenant_id", tenantId)
        .single();

    if (!member || (member.role !== "tenant_owner" && member.role !== "agency_admin")) {
        return { success: false, error: "Yetkisiz işlem." };
    }

    const { data: connection, error: connError } = await supabase
        .from("channel_connections")
        .select("access_token_encrypted, meta_identifiers")
        .eq("tenant_id", tenantId)
        .eq("channel", "whatsapp")
        .eq("status", "connected")
        .single();

    if (connError || !connection) {
        return { success: false, error: "WhatsApp bağlantısı bulunamadı." };
    }

    const wabaId = (connection.meta_identifiers as any)?.waba_id;
    const accessToken = connection.access_token_encrypted;

    if (!wabaId || !accessToken) {
        return { success: false, error: "WABA ID veya Access Token eksik." };
    }

    try {
        const url = `https://graph.facebook.com/v19.0/${wabaId}/message_templates`;
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const json = await res.json();

        if (json.error) {
            console.error("Meta Template Create Error:", json.error);
            const detailedError = JSON.stringify(json.error);
            return { success: false, error: detailedError };
        }

        return { success: true, data: json };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function saveTemplateAttachment(payload: {
    tenantId: string;
    templateName: string;
    language: string;
    fileUrl: string;
    fileType: string;
}) {
    const supabase = await createClient();

    // Yetki kontrolü
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: member } = await supabase
        .from("tenant_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("tenant_id", payload.tenantId)
        .single();

    if (!member) return { success: false, error: "Not a member" };

    // Veritabanına upsert yap (varsa güncelle, yoksa ekle)
    const { error } = await supabase
        .from("whatsapp_template_attachments")
        .upsert({
            tenant_id: payload.tenantId,
            template_name: payload.templateName,
            language: payload.language,
            file_url: payload.fileUrl,
            file_type: payload.fileType
        }, { onConflict: "tenant_id, template_name, language" });

    if (error) {
        console.error("Save attachment error:", error);
        return { success: false, error: error.message };
    }

    return { success: true };
}
