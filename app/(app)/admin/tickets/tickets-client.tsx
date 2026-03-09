"use client";

import { useEffect, useState } from "react";
import { getAllTickets } from "@/app/actions/tickets";
import { createClient } from "@/lib/supabase/client";
import { Search, MessageSquare, HelpCircle } from "lucide-react";
import { TicketChat } from "@/components/help/ticket-chat";
import { clsx } from "clsx";

interface TicketsClientProps {
    userId: string;
}

export function TicketsClient({ userId }: TicketsClientProps) {
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchTickets = async () => {
        const data = await getAllTickets();
        setTickets(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchTickets();

        const supabase = createClient();
        const sub1 = supabase.channel(`admin-tickets`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "support_tickets" },
                () => fetchTickets()
            )
            .subscribe();

        const sub2 = supabase.channel(`admin-messages`)
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "ticket_messages" },
                () => fetchTickets()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(sub1);
            supabase.removeChannel(sub2);
        };
    }, []);

    const selectedTicket = tickets.find(t => t.id === selectedTicketId);

    const filteredTickets = tickets.filter(t =>
        (t.subject && t.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.tenants?.name && t.tenants.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const formatCategory = (cat: string) => {
        const map: Record<string, string> = {
            'billing': 'Fatura',
            'subscription': 'Abonelik',
            'meta_approval': 'WhatsApp Onay',
            'connection_issue': 'Bağlantı Sorunu',
            'ai_settings': 'AI Ayarları',
            'campaign_reject': 'Kampanya Reddi',
            'technical_error': 'Teknik Hata',
            'other': 'Diğer'
        };
        return map[cat] || cat;
    };

    return (
        <div className="flex h-full w-full overflow-hidden bg-background relative flex-col">
            <div className="flex-1 flex overflow-hidden">
                {/* Left Pane: Ticket List */}
                <div className={clsx(
                    "shrink-0 flex flex-col border-r border-slate-200 bg-slate-50 transition-all duration-300 absolute inset-0 z-10 md:static md:w-[35%] md:min-w-[350px] md:max-w-[450px]",
                    selectedTicketId ? "translate-x-[-100%] md:translate-x-0" : "translate-x-0"
                )}>
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0 h-[68px]">
                        <h2 className="text-xl font-bold text-slate-900">Destek Talepleri</h2>

                        <div className="flex bg-slate-100 rounded-full px-3 py-1 text-sm font-semibold text-slate-600 border border-slate-200 shadow-sm">
                            {tickets.filter(t => t.status === 'open').length} Açık Talep
                        </div>
                    </div>

                    <div className="p-3 border-b border-slate-200 bg-slate-50 shrink-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="İşletme veya konu ara..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-10 pl-9 pr-4 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="p-6 text-center text-slate-500 font-medium">Yükleniyor...</div>
                        ) : filteredTickets.length === 0 ? (
                            <div className="p-8 text-center flex flex-col items-center justify-center h-full text-slate-500">
                                <HelpCircle size={48} className="opacity-20 mb-4" />
                                <p>Henüz bir destek talebi bulunmuyor.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {filteredTickets.map((ticket) => (
                                    <div
                                        key={ticket.id}
                                        onClick={() => setSelectedTicketId(ticket.id)}
                                        className={clsx(
                                            "p-4 cursor-pointer hover:bg-slate-100 transition-colors flex flex-col gap-2 relative border-l-4",
                                            selectedTicketId === ticket.id ? "bg-slate-100 border-l-primary" : "border-l-transparent",
                                            ticket.has_unread_user_message && selectedTicketId !== ticket.id && "bg-orange-50/50 border-l-orange-400"
                                        )}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-500 truncate max-w-[200px] mb-0.5">
                                                    🏢 {ticket.tenants?.name || "Bilinmeyen İşletme"}
                                                </span>
                                                <h3 className={clsx("font-semibold line-clamp-1 pr-6", ticket.has_unread_user_message ? "text-orange-900" : "text-slate-900")}>
                                                    {ticket.subject}
                                                </h3>
                                            </div>
                                            <span className="text-xs text-slate-400 shrink-0 font-medium">
                                                {new Date(ticket.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded border border-slate-200 bg-white text-slate-600">
                                                {formatCategory(ticket.category)}
                                            </span>

                                            {/* Status Badge */}
                                            {ticket.status === 'open' && <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Açık</span>}
                                            {ticket.status === 'closed' && <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">Kapalı</span>}
                                            {ticket.status === 'waiting_on_user' && <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Cevap Bekliyor</span>}
                                        </div>

                                        {/* Unread dot */}
                                        {ticket.has_unread_user_message && (
                                            <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse shadow-sm shadow-orange-500/50"></div>
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
                            tenantId={selectedTicket.tenant_id}
                            userId={userId}
                            role="admin"
                            onBack={() => setSelectedTicketId(null)}
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
        </div>
    );
}
