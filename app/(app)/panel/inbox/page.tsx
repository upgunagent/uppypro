
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { MessageCircle, Instagram, AlertTriangle, MessageSquare, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RepairTenantButton } from "@/components/repair-tenant-button";
import { ConversationList } from "@/components/inbox/conversation-list";
import ChatInterface from "@/components/chat/chat-interface";
import { clsx } from "clsx";

export const dynamic = "force-dynamic";

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ tab?: string; chatId?: string; tenantId?: string }> }) {
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
                .eq("tenant_id", selectedConversation.tenant_id) // Extra RLS safety
                .order("created_at", { ascending: true });
            selectedMessages = msgData || [];

            // Fetch Agent Settings
            const { data: settingsData } = await queryClient
                .from("agent_settings")
                .select("ai_operational_enabled")
                .eq("tenant_id", selectedConversation.tenant_id)
                .maybeSingle(); // Changed from single() to maybeSingle()
            agentSettings = settingsData;
        }
    }

    const isMobileChatOpen = !!selectedConversation;

    return (
        <div className="flex h-full w-full overflow-hidden bg-background relative">
            {/* Left Pane: Conversation List */}
            {/* Mobile: Hidden if chat is open. Desktop: Always visible (w-[35%]) */}
            <div className={clsx(
                "shrink-0 flex flex-col border-r border-slate-200 bg-slate-50 transition-all duration-300 absolute inset-0 z-10 md:static md:w-[35%] md:min-w-[350px] md:max-w-[650px]",
                isMobileChatOpen ? "translate-x-[-100%] md:translate-x-0" : "translate-x-0"
            )}>
                <ConversationList
                    initialConversations={conversations as any}
                    tenantId={tenantId}
                    currentTab={tab}
                    selectedChatId={chatId}
                />
            </div>

            {/* Right Pane: Chat Area */}
            {/* Mobile: Full Screen (absolute). Desktop: Flex-1 */}
            <div className={clsx(
                "flex-1 flex flex-col bg-slate-50 overflow-hidden absolute inset-0 z-20 md:static md:block transition-transform duration-300 bg-white",
                isMobileChatOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
            )}>
                {selectedConversation ? (
                    <div className="h-full w-full flex flex-col">
                        {/* Mobile Header with Back Button */}
                        <div className="md:hidden h-14 border-b flex items-center px-4 bg-white shrink-0 gap-3">
                            <Link href={`/panel/inbox?tab=${tab}`} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600">
                                <ArrowLeft size={20} />
                            </Link>
                            <div className="font-semibold text-slate-900 truncate flex-1">
                                {selectedConversation.customer_handle || selectedConversation.external_thread_id}
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden relative">
                            <ChatInterface
                                key={selectedConversation.id}
                                conversationId={selectedConversation.id}
                                initialMessages={selectedMessages}
                                conversationMode={selectedConversation.mode}
                                aiOperational={agentSettings?.ai_operational_enabled || false}
                                platform={selectedConversation.channel || 'whatsapp'}
                                customerName={selectedConversation.customer_handle || selectedConversation.external_thread_id || 'Bilinmeyen Kullanıcı'}
                                profilePic={selectedConversation.profile_pic}
                            />
                        </div>
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
