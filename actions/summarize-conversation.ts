"use server";

import { createClient } from "@/lib/supabase/server";

export async function summarizeConversation(tenantId: string, conversationId: string) {
    const supabase = await createClient();

    // 1. Get Webhook URL from platform settings
    const { data: setting } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "ai_summary_webhook_url")
        .single();

    if (!setting?.value) {
        return { error: "Ajans Webhook URL tanımlanmamış. Lütfen yönetici ile iletişime geçin." };
    }

    const webhookUrl = setting.value;

    // 2. Fetch conversation messages
    const { data: messages, error } = await supabase
        .from("messages")
        .select("text, direction, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(50); // Analyze last 50 messages

    if (error) {
        console.error("Error fetching messages:", error);
        return { error: `Mesajlar alınırken hata oluştu: ${error.message}` };
    }

    if (!messages || messages.length === 0) {
        return { error: `Bu konuşma için hiç mesaj bulunamadı. (Conversation ID: ${conversationId})` };
    }

    // Prepare payload
    // Reverse to chronological order for better context
    const sortedMessages = messages.reverse().map(msg => ({
        role: msg.direction === 'IN' ? 'user' : 'assistant', // IN denotes customer, OUT denotes agent/system
        content: msg.text
    }));

    try {
        // 3. Send to N8n
        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messages: sortedMessages,
                tenantId,
                conversationId,
                timestamp: new Date().toISOString()
            })
        });

        if (!response.ok) {
            return { error: "Yapay zeka servisine ulaşılamadı. Status: " + response.status };
        }

        const data = await response.json();

        // N8n Agent node usually returns "output" or "text". logic to handle both.
        const summaryText = data.summary || data.output || data.text;

        if (!summaryText) {
            console.error("N8n response data:", data);
            return { error: "Özet oluşturulamadı. Servis boş yanıt döndü." };
        }

        return { summary: summaryText };

    } catch (err: any) {
        return { error: "Bir bağlantı hatası oluştu: " + err.message };
    }
}
