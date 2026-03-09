"use client";

import { useEffect, useState } from "react";
import { getTickets } from "@/app/actions/tickets";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, HelpCircle, ArrowRight, MessageCircle } from "lucide-react";
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
                () => fetchTickets()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(sub1);
            supabase.removeChannel(sub2);
        };
    }, [tenantId]);

    const formatCategory = (cat: string) => {
        const map: Record<string, string> = {
            'billing': 'Fatura & Ödeme',
            'subscription': 'Abonelik & Paket Yükseltme',
            'meta_approval': 'Meta (WhatsApp) Onay Sorunları',
            'connection_issue': 'Bağlantı Kopmaları',
            'ai_settings': 'AI / Yapay Zeka Bot Ayarları',
            'campaign_reject': 'Kampanya ve Şablon Reddi',
            'technical_error': 'Teknik Hata Bildirimi',
            'other': 'Diğer / Öneri'
        };
        return map[cat] || cat;
    };

    const selectedTicket = tickets.find(t => t.id === selectedTicketId);

    if (selectedTicket) {
        return (
            <div className="p-4 md:p-8 max-w-[1000px] h-screen overflow-y-auto">
                <TicketChat
                    ticket={selectedTicket}
                    tenantId={tenantId}
                    onBack={() => {
                        setSelectedTicketId(null);
                        fetchTickets();
                    }}
                    userId={userId}
                    role="tenant"
                    onMessageSent={() => fetchTickets()}
                />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-[1200px] pb-24 h-screen overflow-y-auto w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Yardım & Destek</h1>
                    <p className="text-slate-500 mt-1">Sistem uzmanlarımızdan destek alın, taleplerinizi yönetin.</p>
                </div>
                <Button
                    onClick={() => setShowNewModal(true)}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-semibold flex items-center gap-2 h-11 px-5 rounded-xl shadow-sm hover:shadow-md transition-all shrink-0"
                >
                    <Plus size={18} /> Yeni Talep Oluştur
                </Button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                    <div className="p-2.5 bg-orange-50 rounded-xl text-orange-600">
                        <MessageCircle size={22} className="stroke-[2.5]" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-800">Geçmiş Destek Talepleri</h2>
                </div>

                <div className="p-0">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 font-medium">Talepler yükleniyor...</div>
                    ) : tickets.length === 0 ? (
                        <div className="p-16 text-center flex flex-col items-center justify-center text-slate-500">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <HelpCircle size={32} className="text-slate-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-700 mb-1">Geçmiş Talebiniz Yok</h3>
                            <p className="max-w-md text-sm text-slate-500 mb-6 border-transparent">
                                Henüz Müşteri Destek ekibimize açılmış bir biletiniz bulunmuyor. Bir sorun yaşarsanız veya sormak istediğiniz bir konu olursa "Yeni Talep Oluştur" butonunu kullanabilirsiniz.
                            </p>
                            <Button variant="outline" onClick={() => setShowNewModal(true)} className="border-orange-200 text-orange-700 hover:bg-orange-50 rounded-xl px-6">
                                İlk Talebi Oluştur
                            </Button>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {tickets.map((ticket) => (
                                <div
                                    key={ticket.id}
                                    onClick={() => setSelectedTicketId(ticket.id)}
                                    className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 hover:bg-orange-50/40 cursor-pointer transition-colors"
                                >
                                    <div className="flex-1 min-w-0 pr-4">
                                        <div className="flex items-center gap-3 mb-1.5">
                                            <span className="text-xs font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                                {formatCategory(ticket.category)}
                                            </span>

                                            {/* Status Badge */}
                                            {ticket.status === 'open' && <span className="text-xs font-bold px-2.5 py-1 rounded bg-blue-100 text-blue-700 border border-blue-200/60">Açık</span>}
                                            {ticket.status === 'closed' && <span className="text-xs font-bold px-2.5 py-1 rounded bg-slate-200 text-slate-700 border border-slate-300/60">Kapalı</span>}
                                            {ticket.status === 'waiting_on_user' && <span className="text-xs font-bold px-2.5 py-1 rounded bg-amber-100 text-amber-700 border border-amber-200/60">Cevap Bekliyor</span>}

                                            {ticket.has_unread_admin_message && (
                                                <span className="flex h-2.5 w-2.5 bg-red-500 rounded-full animate-pulse shadow-sm shadow-red-500/50" title="Okunmamış mesaj var" />
                                            )}
                                        </div>
                                        <h3 className={clsx(
                                            "text-base font-bold truncate",
                                            ticket.has_unread_admin_message ? "text-slate-900" : "text-slate-700 group-hover:text-orange-700"
                                        )}>
                                            {ticket.subject}
                                        </h3>
                                        <p className="text-sm text-slate-500 mt-1 line-clamp-1 border-transparent">
                                            {ticket.ticket_messages?.[0]?.message || 'Detaylar için tıklayın...'}
                                        </p>
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
                                        <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-orange-100 text-slate-400 group-hover:text-orange-600 flex items-center justify-center transition-colors">
                                            <ArrowRight size={20} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {showNewModal && (
                <NewTicketModal
                    tenantId={tenantId}
                    onClose={() => setShowNewModal(false)}
                    onSuccess={(newTicketId: string) => {
                        setShowNewModal(false);
                        setSelectedTicketId(newTicketId);
                        fetchTickets();
                    }}
                />
            )}
        </div>
    );
}
