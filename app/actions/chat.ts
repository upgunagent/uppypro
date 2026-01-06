"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendToChannel } from "@/lib/meta";

export async function sendMessage(conversationId: string, text: string, mediaUrl?: string, messageType: string = 'text', filename?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Yetkisiz Erişim");

    // 1. Get conversation to know tenant_id and channel details
    const { data: conv } = await supabase.from("conversations").select("tenant_id, channel, external_thread_id").eq("id", conversationId).single();
    if (!conv) throw new Error("Konuşma bulunamadı");

    // 2. Insert Message
    const { error } = await supabase.from("messages").insert({
        tenant_id: conv.tenant_id,
        conversation_id: conversationId,
        direction: "OUT",
        sender: "HUMAN",
        text: text,
        media_url: mediaUrl,
        message_type: messageType
    });

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
            throw new Error(`Mesaj gönderildi (DB) ama iletilemedi: ${result.error}`);
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

    export async function deleteConversation(conversationId: string) {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Yetkisiz Erişim");

        // Check ownership/tenancy via RLS implicitly

        // Explicit Delete: Messages first (if no cascade)
        // Actually, Supabase typically sets ON DELETE CASCADE for foreign keys.
        // If not, we'd delete messages. Assuming CASCADE or explicit delete:
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
