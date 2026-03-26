
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

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ tab?: string; chatId?: string; tenantId?: string; customerNumber?: string }> }) {
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
    const chatId = resolvedParams?.chatId?.replace(/^=+/, '') || undefined; // Strip leading '=' from chatId
    const customerNumber = resolvedParams?.customerNumber;

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

    // Müşteri profil fotoğraflarını conversations verisine birleştir
    if (conversations && conversations.length > 0) {
        const customerIds = conversations
            .filter((c: any) => c.customer_id && !c.profile_pic)
            .map((c: any) => c.customer_id);

        if (customerIds.length > 0) {
            const { data: customers } = await queryClient
                .from('customers')
                .select('id, profile_pic')
                .in('id', customerIds);

            if (customers) {
                const picMap: Record<string, string> = {};
                customers.forEach((c: any) => {
                    if (c.profile_pic) picMap[c.id] = c.profile_pic;
                });
                conversations.forEach((conv: any) => {
                    if (!conv.profile_pic && conv.customer_id && picMap[conv.customer_id]) {
                        conv.profile_pic = picMap[conv.customer_id];
                    }
                });
            }
        }
    }

    // Fetch Selected Chat Data (if any)
    let selectedConversation = null;
    let selectedMessages: any[] = [];
    let agentSettings = null;
    let resolvedChatId = chatId;

    if (chatId || customerNumber) {
        const adminClient = createAdminClient();

        // Step 1: Try by chatId with regular client
        if (chatId) {
            const { data: convData } = await queryClient
                .from("conversations")
                .select("*")
                .eq("id", chatId)
                .maybeSingle();
            selectedConversation = convData;
        }

        // Step 2: Try by chatId with admin client (bypasses RLS)
        if (!selectedConversation && chatId) {
            const { data: adminConvData } = await adminClient
                .from("conversations")
                .select("*")
                .eq("id", chatId)
                .eq("tenant_id", tenantId)
                .maybeSingle();
            selectedConversation = adminConvData;
        }

        // Step 3: Search in already-loaded conversations list (by ID or by phone number)
        if (!selectedConversation && conversations) {
            const normalizedNumber = customerNumber?.replace(/[^0-9]/g, '');
            const found = (conversations as any[])?.find((c: any) => {
                // Match by chatId
                if (chatId && c.id === chatId) return true;
                // Match by phone number (normalize both sides)
                if (normalizedNumber) {
                    const convNumber = (c.external_thread_id || '').replace(/[^0-9]/g, '');
                    if (convNumber && convNumber === normalizedNumber) return true;
                }
                return false;
            });
            if (found) {
                selectedConversation = found;
            }
        }

        // Step 4: Search by customerNumber (external_thread_id) with normalized formats
        if (!selectedConversation && customerNumber) {
            const digitsOnly = customerNumber.replace(/[^0-9]/g, '');
            const { data: convByNumber } = await adminClient
                .from("conversations")
                .select("*")
                .eq("tenant_id", tenantId)
                .or(`external_thread_id.eq.${digitsOnly},external_thread_id.eq.+${digitsOnly},external_thread_id.eq.${customerNumber}`)
                .order("updated_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            selectedConversation = convByNumber;
        }

        // Update resolvedChatId if we found the conversation through a fallback
        if (selectedConversation) {
            resolvedChatId = selectedConversation.id;

            // Fetch Messages
            const { data: msgData } = await adminClient
                .from("messages")
                .select("*")
                .eq("conversation_id", selectedConversation.id)
                .eq("tenant_id", selectedConversation.tenant_id)
                .order("created_at", { ascending: true });

            selectedMessages = msgData || [];

            // Fetch Agent Settings
            const { data: settingsData } = await adminClient
                .from("agent_settings")
                .select("ai_operational_enabled")
                .eq("tenant_id", selectedConversation.tenant_id)
                .maybeSingle();
            agentSettings = settingsData;

            // Müşterinin profil fotoğrafını conversation'a birleştir
            if (!selectedConversation.profile_pic && selectedConversation.customer_id) {
                const { data: customerData } = await adminClient
                    .from('customers')
                    .select('profile_pic')
                    .eq('id', selectedConversation.customer_id)
                    .single();
                if (customerData?.profile_pic) {
                    selectedConversation.profile_pic = customerData.profile_pic;
                }
            }
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
                    selectedChatId={resolvedChatId}
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
                                mobileBackUrl={`/panel/inbox?tab=${tab}`}
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
                        <div className="relative z-10 flex flex-col items-center gap-4 md:gap-6 animate-in fade-in zoom-in duration-500">
                            <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100/50 flex items-center justify-center relative group hover:scale-[1.02] transition-transform duration-300">
                                <div className="absolute inset-0 bg-gradient-to-tr from-orange-100 to-rose-50 rounded-[2rem] md:rounded-[2.5rem] opacity-50 group-hover:opacity-80 transition-opacity"></div>
                                <MessageSquare className="w-12 h-12 md:w-16 md:h-16 text-orange-500 relative z-10 drop-shadow-sm transition-transform duration-500 group-hover:rotate-6" strokeWidth={1.5} />
                                <div className="absolute -top-1 md:-top-2 -right-1 md:-right-2 bg-green-500 rounded-full p-1.5 md:p-2 border-2 md:border-4 border-white shadow-sm rotate-12 group-hover:scale-110 transition-transform">
                                    <MessageCircle className="w-3.5 h-3.5 md:w-3.5 md:h-3.5 text-white" />
                                </div>
                                <div className="absolute -bottom-1 md:-bottom-2 -left-1 md:-left-2 bg-gradient-to-tr from-rose-500 to-pink-500 rounded-full p-1.5 md:p-2 border-2 md:border-4 border-white shadow-sm -rotate-12 group-hover:scale-110 transition-transform">
                                    <Instagram className="w-3.5 h-3.5 md:w-3.5 md:h-3.5 text-white" />
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-1.5 md:gap-2">
                                <h3 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">Gelen Kutusu</h3>
                                <p className="text-sm md:text-base text-slate-500 font-medium text-center px-4">Sohbeti görüntülemek için sol taraftan bir konuşma seçin</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
