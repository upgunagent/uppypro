
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

    // Fix: Handle multiple tenants by taking the first one
    const { data: member } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

    const tenantId = member?.tenant_id;

    if (!tenantId) {
        // DETECT RLS ISSUE:
        // Check if the record actually exists using Admin privileges
        const admin = createAdminClient();
        const { data: adminMember } = await admin
            .from("tenant_members")
            .select("tenant_id")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();

        if (adminMember) {
            // It exists but user can't see it -> RLS ERROR
            return (
                <div className="p-8 max-w-2xl mx-auto mt-10 border border-red-500/50 bg-red-900/20 rounded-xl">
                    <div className="flex items-center gap-4 mb-4 text-red-400">
                        <AlertTriangle size={32} />
                        <h2 className="text-xl font-bold">Veritabanı Güncellemesi Gerekli (RLS Hatası)</h2>
                    </div>
                    <p className="mb-4 text-gray-300">
                        Kaydınız veritabanında mevcut, ancak güvenlik kuralları (RLS) veriyi görmenizi engelliyor.
                        Bu, <strong>fix_rls.sql</strong> kodunun henüz başarıyla çalıştırılmadığını gösterir.
                    </p>
                    <div className="bg-black/50 p-4 rounded-lg font-mono text-xs text-green-400 overflow-x-auto">
                        <p className="text-gray-500 mb-2"># Lütfen bu kodu Supabase SQL Editor'de çalıştırın:</p>
                        <pre>{`ALTER TABLE tenant_members DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view members of their tenant" ON tenant_members;
CREATE POLICY "Users can view own membership" ON tenant_members FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Members can view peers" ON tenant_members FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;`}</pre>
                    </div>
                </div>
            );
        }

        // Really doesn't exist
        return <div className="p-12"><RepairTenantButton /></div>;
    }

    const resolvedParams = await searchParams;
    const tab = resolvedParams?.tab || "all"; // all, whatsapp, instagram
    const chatId = resolvedParams?.chatId;

    // Fetch Conversations List
    let query = supabase
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
        const { data: convData } = await supabase
            .from("conversations")
            .select("*")
            .eq("id", chatId)
            .maybeSingle(); // Use maybeSingle to avoid error if deleted/not found

        selectedConversation = convData;

        if (selectedConversation) {
            // Fetch Messages
            const { data: msgData } = await supabase
                .from("messages")
                .select("*")
                .eq("conversation_id", chatId)
                .order("created_at", { ascending: true });
            selectedMessages = msgData || [];

            // Fetch Agent Settings
            const { data: settingsData } = await supabase
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
            <div className="w-[675px] flex flex-col border-r border-slate-200 bg-slate-50">
                <div className="h-16 flex items-center px-4 border-b border-slate-200 shrink-0">
                    <h1 className="text-xl font-bold">
                        {tab === 'all' && 'Tüm Mesajlar'}
                        {tab === 'whatsapp' && 'WhatsApp'}
                        {tab === 'instagram' && 'Instagram'}
                    </h1>
                </div>

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
