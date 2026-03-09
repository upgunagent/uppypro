
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
        const { data: member, error: memberErr } = await supabase
            .from("tenant_members")
            .select("tenant_id")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();

        if (memberErr) {
            console.error("Tenant member fetch error:", memberErr);
            throw new Error("İşletme bilgisi alınırken geçici bir ağ veya veritabanı hatası oluştu. Lütfen sayfayı yenileyin.");
        }

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
            const { data: msgData, error: msgError } = await queryClient
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
                                tenantId={selectedConversation.tenant_id}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4 relative overflow-hidden bg-slate-50/50">
                        {/* Decorative Background Logos */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
                            {/* WhatsApp Logos */}
                            <MessageCircle className="absolute top-[10%] left-[15%] w-64 h-64 -rotate-12" />
                            <MessageCircle className="absolute top-[60%] left-[8%] w-48 h-48 rotate-45" />
                            <MessageCircle className="absolute top-[20%] right-[20%] w-72 h-72 rotate-12" />
                            <MessageCircle className="absolute -bottom-10 right-[35%] w-80 h-80 -rotate-45" />
                            <MessageCircle className="absolute top-[40%] left-[45%] w-56 h-56 rotate-90" />

                            {/* Instagram Logos */}
                            <Instagram className="absolute top-[15%] right-[5%] w-56 h-56 rotate-12" />
                            <Instagram className="absolute top-[55%] right-[10%] w-64 h-64 -rotate-12" />
                            <Instagram className="absolute bottom-[10%] left-[20%] w-48 h-48 -rotate-45" />
                            <Instagram className="absolute top-[5%] left-[40%] w-52 h-52 rotate-45" />
                            <Instagram className="absolute bottom-[20%] right-[50%] w-72 h-72 rotate-12" />
                        </div>

                        {/* Content */}
                        <div className="relative z-10 flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100/50 flex items-center justify-center relative group hover:scale-[1.02] transition-transform duration-300">
                                <div className="absolute inset-0 bg-gradient-to-tr from-orange-100 to-rose-50 rounded-[2.5rem] opacity-50 group-hover:opacity-80 transition-opacity"></div>
                                <MessageSquare size={64} className="text-orange-500 relative z-10 drop-shadow-sm transition-transform duration-500 group-hover:rotate-6" strokeWidth={1.5} />
                                <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-2 border-4 border-white shadow-sm rotate-12 group-hover:scale-110 transition-transform">
                                    <MessageCircle size={14} className="text-white" />
                                </div>
                                <div className="absolute -bottom-2 -left-2 bg-gradient-to-tr from-rose-500 to-pink-500 rounded-full p-2 border-4 border-white shadow-sm -rotate-12 group-hover:scale-110 transition-transform">
                                    <Instagram size={14} className="text-white" />
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Gelen Kutusu</h3>
                                <p className="text-base text-slate-500 font-medium">Sohbeti görüntülemek için sol taraftan bir konuşma seçin</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
