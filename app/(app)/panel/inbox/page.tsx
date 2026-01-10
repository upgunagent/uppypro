
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { MessageCircle, Instagram, AlertTriangle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RepairTenantButton } from "@/components/repair-tenant-button";
import { ConversationList } from "@/components/inbox/conversation-list";
import ChatInterface from "@/components/chat/chat-interface";

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ tab?: string; chatId?: string }> }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return <div>Giriş yapmanız gerekiyor</div>;

    const resolvedParams = await searchParams;
    let tenantId = resolvedParams?.tenantId;
    const isSuperAdminCheck = createAdminClient();

    // Check if user is Super Admin
    const { data: superAdminRole } = await isSuperAdminCheck
        .from("tenant_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "agency_admin")
        .maybeSingle();

    // Determine Client & Tenant
    let queryClient = supabase;

    if (superAdminRole && tenantId) {
        // Super admin browsing a specific tenant -> Use Admin Client to bypass RLS
        queryClient = createAdminClient();
    } else {
        // Regular user -> Get their tenant
        const { data: member } = await supabase
            .from("tenant_members")
            .select("tenant_id")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();

        tenantId = member?.tenant_id;
    }

    if (!tenantId) {
        // ... (Existing RLS check or No Tenant logic - Simplified for brevity)
        return <div className="p-12"><RepairTenantButton /></div>;
    }

    const tab = resolvedParams?.tab || "all";
    const chatId = resolvedParams?.chatId;

    // Fetch Conversations List
    let query = queryClient
        .from("conversations")
        .select("*, messages(*)")
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false });

    if (tab !== "all") {
        query = query.eq("channel", tab);
    }

    const { data: conversations } = await query;

    // Fetch Selected Chat Data (if any)
    let selectedConversation = null;
    let selectedMessages: any[] = [];
    let agentSettings = null;

    if (chatId) {
        // Fetch Conversation Details
        const { data: convData } = await queryClient
            .from("conversations")
            .select("*")
            .eq("id", chatId)
            .maybeSingle();

        selectedConversation = convData;

        if (selectedConversation) {
            // Fetch Messages
            const { data: msgData } = await queryClient
                .from("messages")
                .select("*")
                .eq("conversation_id", chatId)
                .order("created_at", { ascending: true });
            selectedMessages = msgData || [];

            // Fetch Agent Settings
            const { data: settingsData } = await queryClient
                .from("agent_settings")
                .select("ai_operational_enabled")
                .eq("tenant_id", selectedConversation.tenant_id)
                .single();
            agentSettings = settingsData;
        }
    }

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background">
            {/* Left Pane: Conversation List */}
            <div className="w-[35%] min-w-[350px] max-w-[650px] shrink-0 flex flex-col border-r border-slate-200 bg-slate-50">
                <ConversationList
                    initialConversations={conversations as any}
                    tenantId={tenantId}
                    currentTab={tab}
                    selectedChatId={chatId}
                />
            </div>

            {/* Right Pane: Chat Area */}
            <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
                {selectedConversation ? (
                    <div className="h-full w-full">
                        <ChatInterface
                            conversationId={selectedConversation.id}
                            initialMessages={selectedMessages}
                            conversationMode={selectedConversation.mode}
                            aiOperational={agentSettings?.ai_operational_enabled || false}
                            platform={selectedConversation.channel || 'whatsapp'}
                            customerName={selectedConversation.customer_handle || selectedConversation.external_thread_id || 'Bilinmeyen Kullanıcı'}
                        />
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                        <div className="bg-white/5 p-6 rounded-full">
                            <MessageSquare size={48} className="opacity-50" />
                        </div>
                        <p className="text-lg">Görüntülemek için bir konuşma seçin</p>
                    </div>
                )}
            </div>
        </div>
    );
}
