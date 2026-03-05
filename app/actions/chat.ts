"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendToChannel, editMessageInChannel } from "@/lib/meta";
import { createAdminClient } from "@/lib/supabase/admin";

export async function sendMessage(conversationId: string, text: string, mediaUrl?: string, messageType: string = 'text', filename?: string, payload?: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Yetkisiz Erişim");

    // 1. Get conversation to know tenant_id and channel details
    const { data: conv } = await supabase.from("conversations").select("tenant_id, channel, external_thread_id").eq("id", conversationId).single();
    if (!conv) throw new Error("Konuşma bulunamadı");

    // 2. Insert Message
    const { data: insertedMsg, error } = await supabase.from("messages").insert({
        tenant_id: conv.tenant_id,
        conversation_id: conversationId,
        direction: "OUT",
        sender: "HUMAN",
        text: text,
        media_url: mediaUrl,
        message_type: messageType,
        payload: payload
    }).select().single();

    if (error) throw new Error(error.message);

    // 3. Trigger Outbound API (Meta Send)
    if (process.env.MOCK_META_SEND !== "true") {
        const result = await sendToChannel(
            conv.tenant_id,
            conv.channel,
            conv.external_thread_id,
            text,
            messageType,
            mediaUrl,
            filename,
            payload
        );

        if (!result.success) {
            console.error("Meta Send Failed:", result.error);
            // Mesajı DB'de failed olarak işaretle
            const adminDb = createAdminClient();
            await adminDb.from("messages").update({
                payload: { ...((payload as any) || {}), _send_error: result.error }
            }).eq("id", insertedMsg.id);

            return { data: insertedMsg, error: `Mesaj iletilemedi: ${result.error}` };
        }

        // CAPTURE EXTERNAL ID
        const extId = result.data?.messages?.[0]?.id || result.data?.message_id;

        if (extId && insertedMsg) {
            const adminDb = createAdminClient();
            const { error: updateError } = await adminDb
                .from("messages")
                .update({ external_message_id: extId })
                .eq("id", insertedMsg.id);

            if (updateError) {
                console.error("Failed to save external_message_id:", updateError);
            }
        }
    }

    revalidatePath(`/panel/chat/${conversationId}`);
    return { data: insertedMsg };
}

export async function toggleMode(conversationId: string, targetMode: "BOT" | "HUMAN") {
    const supabase = await createClient();

    // Logic Fix: Previous implementation flipped the passed argument, causing "HUMAN" input to be saved as "BOT".
    // We now trust the client to pass the DESIRED (Target) mode.

    const { error } = await supabase
        .from("conversations")
        .update({ mode: targetMode })
        .eq("id", conversationId);

    if (error) throw new Error(error.message);

    revalidatePath(`/panel/chat/${conversationId}`);
}

export async function deleteConversation(conversationId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Yetkisiz Erişim");

    // 1. Verify ownership/access via RLS
    const { data: conv, error: fetchError } = await supabase
        .from("conversations")
        .select("id")
        .eq("id", conversationId)
        .single();

    if (fetchError || !conv) throw new Error("Konuşma bulunamadı veya erişim yok.");

    // 2. Perform Admin Delete (Bypass RLS deletion constraints)
    const adminDb = createAdminClient();

    // Explicit Delete: Messages first (if no cascade)
    await adminDb.from("messages").delete().eq("conversation_id", conversationId);

    // Delete Conversation
    const { error } = await adminDb
        .from("conversations")
        .delete()
        .eq("id", conversationId);

    if (error) {
        console.error("Delete conversation error:", error);
        throw new Error("Konuşma silinemedi");
    }

    revalidatePath("/panel/inbox");
}

export async function clearConversationMessages(conversationId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Yetkisiz Erişim");

    // 1. Verify access
    const { data: conv, error: fetchError } = await supabase
        .from("conversations")
        .select("id")
        .eq("id", conversationId)
        .single();

    if (fetchError || !conv) throw new Error("Erişim reddedildi.");

    // 2. Admin Delete
    const adminDb = createAdminClient();

    // Delete all messages for this conversation
    const { error } = await adminDb
        .from("messages")
        .delete()
        .eq("conversation_id", conversationId);

    if (error) {
        console.error("Clear conversation error:", error);
        throw new Error("Mesajlar temizlenemedi");
    }

    revalidatePath(`/panel/chat/${conversationId}`);
}

export async function editMessage(messageId: string, newText: string, conversationId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Yetkisiz Erişim" };

        // 1. Get Message & Conv Details
        const { data: msg, error } = await supabase
            .from("messages")
            .select("*, conversations(tenant_id, channel, external_thread_id)")
            .eq("id", messageId)
            .single();

        if (error || !msg) return { success: false, error: "Mesaj bulunamadı" };
        if (msg.sender !== 'HUMAN') return { success: false, error: "Sadece kendi mesajlarınızı düzenleyebilirsiniz" };

        // Time Check (15 mins window for WhatsApp)
        const created = new Date(msg.created_at);
        const now = new Date();
        const diffMins = (now.getTime() - created.getTime()) / 1000 / 60;

        // 2. External Edit (WhatsApp Only)
        const conv = msg.conversations as any;
        let warningMsg = undefined;

        if (conv?.channel === 'whatsapp') {
            if (diffMins > 15) return { success: false, error: "WhatsApp mesajları sadece 15 dakika içinde düzenlenebilir." };

            // Orijinalinde burada editMessageInChannel ile Meta API'ye istek atılıyordu.
            // Ancak Meta'nın resmi WhatsApp Cloud API dokümantasyonu, işletme hesaplarından
            // gönderilen mesajların sonradan değiştirilmesini (edit) desteklememektedir.
            // Bu yüzden Meta API çağrısı "Unsupported put request" veya "JSON schema constraint" 
            // hataları vermekteydi (Çünkü API Endpoint'i bunu kabul etmiyor).
            // Çözüm olarak: Sadece kendi veritabanımızda güncelleyip, Instagram'daki gibi uyarı veriyoruz.
            warningMsg = "Not: Resmi WhatsApp Cloud API şu anda gönderilen mesajların sonradan değiştirilmesini desteklememektedir. Değişiklik sadece sizin panelinize yansıdı, müşterinin WhatsApp uygulamasında mesaj değişmedi.";

        } else if (conv?.channel === 'instagram') {
            warningMsg = "Not: Instagram doğrudan mesaj düzenlemeyi henüz desteklememektedir. Değişiklik sadece panelinize yansıdı, müşterinin ekranında değişmedi.";
        } else {
            return { success: false, error: "Bu kanal için düzenleme desteklenmiyor." };
        }

        // 3. Local Update
        const { error: updateError } = await supabase
            .from("messages")
            .update({ text: newText })
            .eq("id", messageId);

        if (updateError) return { success: false, error: "Veritabanı güncellenemedi" };

        revalidatePath(`/panel/chat/${conversationId}`);
        return { success: true, warning: warningMsg };

    } catch (err: any) {
        console.error("Edit Action Error:", err);
        return { success: false, error: "Sunucu hatası: " + (err.message || "Bilinmeyen hata") };
    }
}

export async function markConversationAsRead(conversationId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();



    if (!user) return; // Silent fail

    // Use Admin Client to bypass RLS issues for UPDATE
    const adminDb = createAdminClient();

    const { error, count } = await adminDb
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .eq("direction", "IN")
        .eq("is_read", false)
        .select();

    if (error) {
        console.error("markConversationAsRead Error:", error);
    } else {
        // Success
    }

    revalidatePath("/panel/inbox");
}
