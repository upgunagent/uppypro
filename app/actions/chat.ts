"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendToChannel, editMessageInChannel } from "@/lib/meta";

export async function sendMessage(conversationId: string, text: string, mediaUrl?: string, messageType: string = 'text', filename?: string) {
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
        message_type: messageType
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
            filename
        );

        if (!result.success) {
            console.error("Meta Send Failed:", result.error);
            // Optional: Mark message as failed in DB?
            throw new Error(`Mesaj gönderildi (DB) ama iletilemedi: ${result.error}`);
        }

        // CAPTURE EXTERNAL ID
        const extId = result.data?.messages?.[0]?.id || result.data?.message_id;

        if (extId && insertedMsg) {
            await supabase
                .from("messages")
                .update({ external_message_id: extId })
                .eq("id", insertedMsg.id);
        }
    }

    revalidatePath(`/panel/chat/${conversationId}`);
}

export async function toggleMode(conversationId: string, currentMode: "BOT" | "HUMAN") {
    const supabase = await createClient();
    const newMode = currentMode === "BOT" ? "HUMAN" : "BOT";

    const { error } = await supabase
        .from("conversations")
        .update({ mode: newMode })
        .eq("id", conversationId);

    if (error) throw new Error(error.message);

    revalidatePath(`/panel/chat/${conversationId}`);
}

export async function deleteConversation(conversationId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Yetkisiz Erişim");

    // Explicit Delete: Messages first (if no cascade)
    await supabase.from("messages").delete().eq("conversation_id", conversationId);

    // Delete Conversation
    const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", conversationId);

    if (error) {
        console.error("Delete conversation error:", error);
        throw new Error("Konuşma silinemedi");
    }

    revalidatePath("/panel/inbox");
}

export async function editMessage(messageId: string, newText: string, conversationId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Yetkisiz Erişim");

    // 1. Get Message & Conv Details
    const { data: msg, error } = await supabase
        .from("messages")
        .select("*, conversations(tenant_id, channel)")
        .eq("id", messageId)
        .single();

    if (error || !msg) throw new Error("Mesaj bulunamadı");
    if (msg.sender !== 'HUMAN') throw new Error("Sadece kendi mesajlarınızı düzenleyebilirsiniz");

    // Time Check (15 mins window for WhatsApp)
    const created = new Date(msg.created_at);
    const now = new Date();
    const diffMins = (now.getTime() - created.getTime()) / 1000 / 60;

    // 2. External Edit (WhatsApp Only)
    const conv = msg.conversations as any;

    if (conv?.channel === 'whatsapp') {
        if (diffMins > 15) throw new Error("WhatsApp mesajları sadece 15 dakika içinde düzenlenebilir.");

        if (msg.external_message_id) {
            if (process.env.MOCK_META_SEND !== "true") {
                const result = await editMessageInChannel(
                    conv.tenant_id,
                    'whatsapp',
                    msg.external_message_id,
                    newText
                );
                if (!result.success) throw new Error("WhatsApp düzenleme hatası: " + result.error);
            }
        } else {
            throw new Error("Bu mesajın WhatsApp ID'si bulunamadı (Eski mesaj olabilir), düzenlenemez.");
        }
    } else {
        throw new Error("Sadece WhatsApp mesajları düzenlenebilir.");
    }

    // 3. Local Update
    const { error: updateError } = await supabase
        .from("messages")
        .update({ text: newText })
        .eq("id", messageId);

    if (updateError) throw new Error("Veritabanı güncellenemedi");

    revalidatePath(`/panel/chat/${conversationId}`);
}
