"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendToChannel } from "@/lib/meta";

export async function sendMessage(conversationId: string, text: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Yetkisiz Erişim");

    // Get tenant from conversation or member
    // First verify member access to conversation
    // RLS should handle this, but let's be explicit if needed.
    // Actually, just inserting into 'messages' with 'HUMAN' sender

    // 1. Get conversation to know tenant_id and channel details
    const { data: conv } = await supabase.from("conversations").select("tenant_id, channel, external_thread_id").eq("id", conversationId).single();
    if (!conv) throw new Error("Konuşma bulunamadı");

    // 2. Insert Message
    const { error } = await supabase.from("messages").insert({
        tenant_id: conv.tenant_id,
        conversation_id: conversationId,
        direction: "OUT",
        sender: "HUMAN",
        text: text
    });

    if (error) throw new Error(error.message);

    // 3. Trigger Outbound API (Meta Send)
    if (process.env.MOCK_META_SEND !== "true") {
        try {
            await sendToChannel(conv.tenant_id, conv.channel, conv.external_thread_id, text);
        } catch (e) {
            console.error("Failed to send to Meta:", e);
            // We don't throw here to avoid rolling back the DB insert, 
            // but in a real app we might want to mark message status as 'failed'
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
