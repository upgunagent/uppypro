import { createClient } from "@/lib/supabase/server";
import ChatInterface from "@/components/chat/chat-interface";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ChatPage({ params }: { params: Promise<{ conversationId: string }> }) {
    const supabase = await createClient();
    const resolvedParams = await params;

    // Fetch Conversation, Messages, and Settings (for AI status)
    const { data: conversation } = await supabase
        .from("conversations")
        .select("*, profile_pic") // Explicitly fetch profile_pic to ensure it's included
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

    // Fetch Locations
    const { data: locations } = await supabase
        .from("tenant_locations")
        .select("*")
        .eq("tenant_id", conversation.tenant_id);

    return (
        <div className="max-w-4xl mx-auto h-full flex flex-col">
            <ChatInterface
                conversationId={conversation.id}
                initialMessages={messages || []}
                conversationMode={conversation.mode}
                aiOperational={settings?.ai_operational_enabled || false}
                platform={conversation.channel || 'whatsapp'} // Default to whatsapp if null, or handle as needed
                customerName={conversation.customer_handle || conversation.external_thread_id}
                profilePic={conversation.profile_pic}
                tenantLocations={locations || []}
            />
        </div>
    );
}
