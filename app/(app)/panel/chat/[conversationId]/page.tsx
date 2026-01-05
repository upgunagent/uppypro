
import { createClient } from "@/lib/supabase/server";
import ChatInterface from "@/components/chat/chat-interface";
import { notFound } from "next/navigation";

export default async function ChatPage({ params }: { params: Promise<{ conversationId: string }> }) {
    const supabase = await createClient();
    const resolvedParams = await params;

    // Fetch Conversation, Messages, and Settings (for AI status)
    const { data: conversation } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", resolvedParams.conversationId)
        .single();

    if (!conversation) return notFound();

    // Fetch agent settings separately if join failed or complex
    const { data: settings } = await supabase
        .from("agent_settings")
        .select("ai_operational_enabled")
        .eq("tenant_id", conversation.tenant_id)
        .single();

    // Fetch Messages
    const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", resolvedParams.conversationId)
        .order("created_at", { ascending: true });

    return (
        <div className="max-w-4xl mx-auto h-full">
            <div className="mb-4">
                <h1 className="text-xl font-bold">{conversation.customer_handle || conversation.external_thread_id}</h1>
                <p className="text-sm text-gray-500 font-mono text-xs">{conversation.id}</p>
            </div>

            <ChatInterface
                conversationId={conversation.id}
                initialMessages={messages || []}
                conversationMode={conversation.mode}
                aiOperational={settings?.ai_operational_enabled || false}
            />
        </div>
    );
}
