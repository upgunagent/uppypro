
import { createClient } from "@/lib/supabase/server";
import ChatInterface from "@/components/chat/chat-interface";
import { notFound } from "next/navigation";
import { MessageCircle, Instagram } from "lucide-react";

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
        <div className="max-w-4xl mx-auto h-full flex flex-col">
            <div className="mb-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-white/5 border border-white/10">
                    {conversation.channel === 'whatsapp' ? (
                        <MessageCircle className="text-green-500 w-6 h-6" />
                    ) : (
                        conversation.profile_pic ? (
                            <img
                                src={conversation.profile_pic}
                                alt="Profile"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <Instagram className="text-pink-500 w-6 h-6" />
                        )
                    )}
                </div>
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        {conversation.customer_handle || conversation.external_thread_id}
                        {conversation.channel === 'instagram' && (
                            <Instagram className="w-4 h-4 text-pink-500" />
                        )}
                    </h1>
                    <p className="text-sm text-gray-500 font-mono text-xs">{conversation.id}</p>
                </div>
            </div>

            <ChatInterface
                conversationId={conversation.id}
                initialMessages={messages || []}
                conversationMode={conversation.mode}
                aiOperational={settings?.ai_operational_enabled || false}
                platform={conversation.channel || 'whatsapp'} // Default to whatsapp if null, or handle as needed
                customerName={conversation.customer_handle || conversation.external_thread_id}
            />
        </div>
    );
}
