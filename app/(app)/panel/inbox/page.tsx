
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { MessageCircle, Instagram, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RepairTenantButton } from "@/components/repair-tenant-button";
import { ConversationList } from "@/components/inbox/conversation-list";

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
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

    // Fetch Conversations
    let query = supabase
        .from("conversations")
        .select("*, messages(text, created_at)")
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false });

    if (tab !== "all") {
        query = query.eq("channel", tab);
    }

    const { data: conversations } = await query;

    // Process conversations to get last message
    // Note: Supabase join query might return array of messages. Ideally we sort them or limit 1.
    // For MVP: We fetch messages and take the last one. (Inefficient for production, needs separate view or limit)
    // Or better: `messages` is just for show, but `conversations` should have `last_message` column or we compute it.
    // The schema didn't have `last_message`, so I'll just pick from the joined `messages`.

    // Actually, standard `.select('*, messages(text) ...')` returns all messages.
    // Let's use `messages` table mostly for chat view. The `conversations` table should update `updated_at`.
    // I will just fetch conversations for now, assuming I can show "Click to view" if no message snippet properly fetched.

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Inbox</h1>
                <div className="flex gap-2">
                    <Link href="/panel/inbox?tab=all"><Button variant={tab === 'all' ? 'default' : 'ghost'} size="sm">Tümü</Button></Link>
                    <Link href="/panel/inbox?tab=whatsapp"><Button variant={tab === 'whatsapp' ? 'default' : 'ghost'} size="sm">WhatsApp</Button></Link>
                    <Link href="/panel/inbox?tab=instagram"><Button variant={tab === 'instagram' ? 'default' : 'ghost'} size="sm">Instagram</Button></Link>
                </div>
            </div>

            <ConversationList initialConversations={conversations as any} tenantId={tenantId} />
        </div>
    );
}
