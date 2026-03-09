"use client";

import { useEffect, useState } from "react";
import { getAllTickets } from "@/app/actions/tickets";
import { createClient } from "@/lib/supabase/client";
import { Search, MessageSquare, HelpCircle, ArrowRight, Building2 } from "lucide-react";
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
            'meta_approval': 'WhatsApp Onayı',
            'connection_issue': 'Bağlantı Sorunu',
            'ai_settings': 'AI Ayarları',
            'campaign_reject': 'Kampanya Reddi',
            'technical_error': 'Teknik Hata',
            'other': 'Diğer'
        };
        return map[cat] || cat;
    };

    if (selectedTicket) {
        return (
            <div className="p-4 md:p-8 max-w-[1000px] h-screen overflow-y-auto">
                <TicketChat
                    ticket={selectedTicket}
                    tenantId={selectedTicket.tenant_id}
                    userId={userId}
                    role="admin"
                    onBack={() => {
                        setSelectedTicketId(null);
                        fetchTickets();
                    }}
                />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-[1200px] pb-24 h-screen overflow-y-auto w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Müşteri Destek Masası</h1>
                    <p className="text-slate-500 mt-1">İşletmelerden gelen tüm yardım taleplerini görüntüleyin ve yanıtlayın.</p>
                </div>
                <div className="flex bg-white rounded-xl px-4 py-2 text-sm font-bold text-orange-600 border border-slate-200 shadow-sm items-center gap-2">
                    <span className="flex h-2.5 w-2.5 bg-orange-500 rounded-full animate-pulse shadow-sm shadow-orange-500/50" />
                    {tickets.filter(t => t.status === 'open').length} Açık Talep
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-orange-50 rounded-xl text-orange-600 border border-orange-100/50">
                            <MessageSquare size={20} className="stroke-[2.5]" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">Tüm Talepler</h2>
                    </div>

                    <div className="relative w-full sm:w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="İşletme veya konu ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-10 pl-9 pr-4 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
                        />
                    </div>
                </div>

                <div className="p-0">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 font-medium">Talepler yükleniyor...</div>
                    ) : filteredTickets.length === 0 ? (
                        <div className="p-16 text-center flex flex-col items-center justify-center text-slate-500">
                            <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-4">
                                <HelpCircle size={32} className="text-slate-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-700 mb-1">Açık Talep Bulunamadı</h3>
                            <p className="max-w-md text-sm text-slate-500">Arama kriterlerinize uyan veya bekleyen herhangi bir destek talebi görünmüyor.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredTickets.map((ticket) => (
                                <div
                                    key={ticket.id}
                                    onClick={() => setSelectedTicketId(ticket.id)}
                                    className={clsx(
                                        "group flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 hover:bg-orange-50/50 cursor-pointer transition-colors border-l-4",
                                        ticket.has_unread_user_message ? "bg-orange-50/30 border-l-orange-500" : "border-l-transparent"
                                    )}
                                >
                                    <div className="flex-1 min-w-0 pr-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                                {formatCategory(ticket.category)}
                                            </span>

                                            {ticket.status === 'open' && <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200/60">Açık</span>}
                                            {ticket.status === 'closed' && <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-300/60">Kapalı</span>}
                                            {ticket.status === 'waiting_on_user' && <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200/60">İşletme Cevabı Bekleniyor</span>}

                                            {ticket.has_unread_user_message && (
                                                <span className="flex h-2 w-2 bg-orange-500 rounded-full animate-pulse shadow-sm shadow-orange-500/50" title="Okunmamış Yeni Mesaj" />
                                            )}
                                        </div>

                                        <h3 className={clsx(
                                            "text-[15px] font-bold truncate mb-1",
                                            ticket.has_unread_user_message ? "text-orange-900" : "text-slate-800 group-hover:text-orange-700"
                                        )}>
                                            {ticket.subject}
                                        </h3>

                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <Building2 size={14} className="text-slate-400" />
                                            <span className="font-medium">{ticket.tenants?.name || "Bilinmeyen İşletme"}</span>
                                        </div>
                                    </div>

                                    <div className="mt-4 sm:mt-0 flex items-center justify-between sm:justify-end w-full sm:w-auto gap-6 shrink-0 text-right">
                                        <div className="flex flex-col sm:items-end">
                                            <span className="text-sm font-semibold text-slate-600">
                                                {new Date(ticket.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                            <span className="text-xs font-medium text-slate-400 mt-0.5">
                                                Saat: {new Date(ticket.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-orange-100 text-slate-400 group-hover:text-orange-600 flex items-center justify-center transition-colors shadow-sm">
                                            <ArrowRight size={20} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
