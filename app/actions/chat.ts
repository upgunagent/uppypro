"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function sendMessage(conversationId: string, text: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Yetkisiz Erişim");

    // Get tenant from conversation or member
    // First verify member access to conversation
    // RLS should handle this, but let's be explicit if needed.
    // Actually, just inserting into 'messages' with 'HUMAN' sender

    // 1. Get conversation to know tenant_id
    const { data: conv } = await supabase.from("conversations").select("tenant_id").eq("id", conversationId).single();
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
    // For MVP, if MOCK_META_SEND is true, we just skip or log.
    // In real app, we call our own API route or function to dispatch to Meta.
    // We'll call the API route via fetch (or directly invoke logic if refactored).
    // Let's call the API route to keep it decoupled.
    // Actually, calling an API route from Server Action adds latency. Better to invoke service function.
    // For MVP, just DB insert is enough visually. The actual sending logic is in API section.

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
