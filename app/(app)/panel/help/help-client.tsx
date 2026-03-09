"use client";

import { useEffect, useState, useRef } from "react";
import { getTickets } from "@/app/actions/tickets";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { HelpCircle, Plus, Search, MessageSquare, AlertCircle } from "lucide-react";
import { NewTicketModal } from "@/components/help/new-ticket-modal";
import { TicketChat } from "@/components/help/ticket-chat";
import { clsx } from "clsx";

interface HelpClientProps {
    tenantId: string;
    userId: string;
}

export function HelpClient({ tenantId, userId }: HelpClientProps) {
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [showNewModal, setShowNewModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchTickets = async () => {
        const data = await getTickets(tenantId);
        setTickets(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchTickets();

        const supabase = createClient();
        const sub1 = supabase.channel(`help-tickets:${tenantId}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "support_tickets", filter: `tenant_id=eq.${tenantId}` },
                () => fetchTickets()
            )
            .subscribe();

        const sub2 = supabase.channel(`help-messages:${tenantId}`)
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "ticket_messages" },
                () => fetchTickets() // naive refresh on any message, could be optimized
            )
            .subscribe();

        return () => {
            supabase.removeChannel(sub1);
            supabase.removeChannel(sub2);
        };
    }, [tenantId]);

    const selectedTicket = tickets.find(t => t.id === selectedTicketId);

    const filteredTickets = tickets.filter(t =>
        (t.subject && t.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.category && t.category.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const formatCategory = (cat: string) => {
        const map: Record<string, string> = {
            'billing': 'Fatura & Ödeme',
            'subscription': 'Abonelik & Paket',
            'meta_approval': 'Meta (WhatsApp) Onay',
            'connection_issue': 'Bağlantı Kopması',
            'ai_settings': 'Yapay Zeka Ayarları',
            'campaign_reject': 'Kampanya Reddi',
            'technical_error': 'Teknik Hata',
            'other': 'Diğer'
        };
        return map[cat] || cat;
    };

    const hasAdminRepliedCount = tickets.filter(t => t.has_unread_admin_message).length;

    return (
        <div className="flex h-full w-full overflow-hidden bg-background relative flex-col">
            {/* Mobile Header (similar to Inbox) could go here but we have desktop first view */}

            <div className="flex-1 flex overflow-hidden">
                {/* Left Pane: Ticket List */}
                <div className={clsx(
                    "shrink-0 flex flex-col border-r border-slate-200 bg-slate-50 transition-all duration-300 absolute inset-0 z-10 md:static md:w-[35%] md:min-w-[350px] md:max-w-[450px]",
                    selectedTicketId ? "translate-x-[-100%] md:translate-x-0" : "translate-x-0"
                )}>
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-slate-900">Destek Talepleri</h2>
                        </div>
                        <Button
                            onClick={() => setShowNewModal(true)}
                            className="bg-primary hover:bg-primary/90 text-white shadow-sm flex items-center gap-1 h-9 px-3"
                        >
                            <Plus size={16} /> Yeni Talep
                        </Button>
                    </div>

                    <div className="p-3 border-b border-slate-200 bg-slate-50 shrink-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Taleplerde ara..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-10 pl-9 pr-4 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="p-6 text-center text-slate-500">Yükleniyor...</div>
                        ) : filteredTickets.length === 0 ? (
                            <div className="p-8 text-center flex flex-col items-center justify-center h-full text-slate-500">
                                <HelpCircle size={48} className="opacity-20 mb-4" />
                                <p>Henüz bir destek talebi bulunmuyor.</p>
                                <p className="text-sm mt-2 opacity-70">Sorularınız veya yardım ihtiyacınız için yeni bir talep oluşturabilirsiniz.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {filteredTickets.map((ticket) => (
                                    <div
                                        key={ticket.id}
                                        onClick={() => setSelectedTicketId(ticket.id)}
                                        className={clsx(
                                            "p-4 cursor-pointer hover:bg-slate-100 transition-colors flex flex-col gap-2 relative",
                                            selectedTicketId === ticket.id && "bg-slate-100 border-l-4 border-l-primary"
                                        )}
                                    >
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-semibold text-slate-900 line-clamp-1 pr-6">{ticket.subject}</h3>
                                            <span className="text-xs text-slate-500 shrink-0">
                                                {new Date(ticket.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-xs font-medium px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-600">
                                                {formatCategory(ticket.category)}
                                            </span>

                                            {/* Status Badge */}
                                            {ticket.status === 'open' && <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-700">Açık</span>}
                                            {ticket.status === 'closed' && <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">Kapalı</span>}
                                            {ticket.status === 'waiting_on_user' && <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-700">Cevap Bekliyor</span>}
                                        </div>

                                        {/* Unread dot */}
                                        {ticket.has_unread_admin_message && (
                                            <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-sm shadow-red-500/50"></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Pane: Chat Area */}
                <div className={clsx(
                    "flex-1 flex flex-col bg-slate-50 overflow-hidden absolute inset-0 z-20 md:static md:block transition-transform duration-300 bg-white",
                    selectedTicketId ? "translate-x-0" : "translate-x-full md:translate-x-0"
                )}>
                    {selectedTicket ? (
                        <TicketChat
                            ticket={selectedTicket}
                            tenantId={tenantId}
                            onBack={() => setSelectedTicketId(null)}
                            userId={userId}
                            role="tenant"
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                            <div className="bg-slate-100 p-6 rounded-full">
                                <MessageSquare size={48} className="opacity-40 text-slate-500" />
                            </div>
                            <p className="text-lg font-medium text-slate-600">Görüntülemek için bir talep seçin</p>
                        </div>
                    )}
                </div>
            </div>

            {showNewModal && (
                <NewTicketModal
                    tenantId={tenantId}
                    onClose={() => setShowNewModal(false)}
                    onSuccess={(newTicketId) => {
                        setShowNewModal(false);
                        setSelectedTicketId(newTicketId);
                        fetchTickets();
                    }}
                />
            )}
        </div>
    );
}
