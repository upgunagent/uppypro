"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, X, CheckCircle2, AlertCircle, FileText, Image as ImageIcon, ArrowLeft, Clock, Trash2 } from "lucide-react";
import { addTicketMessage, markTicketStatus, markAdminMessageAsRead, markUserMessageAsRead, deleteTicket } from "@/app/actions/tickets";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface TicketChatProps {
    ticket: any;
    tenantId: string | null;
    userId: string | null;
    role: "tenant" | "admin";
    onBack: () => void;
    onMessageSent?: () => void;
}

export function TicketChat({ ticket, tenantId, userId, role, onBack, onMessageSent }: TicketChatProps) {
    const [messages, setMessages] = useState<any[]>(ticket.ticket_messages || []);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ticket.ticket_messages) {
            const sorted = [...ticket.ticket_messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            setMessages(sorted);
        }
    }, [ticket]);

    useEffect(() => {
        if (role === "tenant" && ticket.has_unread_admin_message) {
            markAdminMessageAsRead(ticket.id).catch(console.error);
        } else if (role === "admin" && ticket.has_unread_user_message) {
            markUserMessageAsRead(ticket.id).catch(console.error);
        }
    }, [ticket.id, role, ticket.has_unread_admin_message, ticket.has_unread_user_message]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!newMessage.trim() && !file) return;

        setSending(true);
        let attachmentUrl = null;

        if (file) {
            const supabase = createClient();
            const fileName = `ticket_msg_${Date.now()}_${file.name}`;
            const { error } = await supabase.storage
                .from("ticket-attachments")
                .upload(fileName, file);

            if (error) {
                toast.error("Dosya yüklenemedi: " + error.message);
                setSending(false);
                return;
            }

            const { data: urlData } = supabase.storage
                .from("ticket-attachments")
                .getPublicUrl(fileName);

            attachmentUrl = urlData.publicUrl;
        }

        const res = await addTicketMessage(ticket.id, newMessage, role === "admin" ? "admin" : "user", attachmentUrl);

        if (res.success) {
            setNewMessage("");
            setFile(null);

            // YÖNETİCİ BAŞARI DURUMU: Admin mesaj yolladıktan sonra ana listeye geri atılsın
            if (role === "admin") {
                onBack();
            } else if (onMessageSent) {
                onMessageSent();
            }
        } else {
            toast.error("Mesaj gönderilemedi: " + res.error);
        }
        setSending(false);
    };

    const handleCloseTicket = async () => {
        if (!confirm("Talebinizi çözüldü olarak kapatmak istediğinize emin misiniz?")) return;
        const res = await markTicketStatus(ticket.id, "closed");
        if (res.success) {
            toast.success("Talep kapatıldı.");
            onBack();
        }
    };

    const handleDeleteTicket = async () => {
        if (!confirm("BU TALEBİ SİLMEK İSTEDİĞİNİZE EMİN MİSİNİZ?\nBu işlem geri alınamaz ve tüm mesaj geçmişi silinir.")) return;

        const res = await deleteTicket(ticket.id, role, tenantId);

        if (res.success) {
            toast.success("Talep ve mesaj geçmişi silindi.");
            onBack(); // Go back to list
            if (onMessageSent) {
                onMessageSent(); // Trigger list refresh if prop exists
            }
        } else {
            toast.error("Talep silinemedi: " + res.error);
        }
    };

    const renderAttachment = (url: string) => {
        const isImage = url.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) != null;

        if (isImage) {
            return (
                <a href={url} target="_blank" rel="noreferrer" className="block mt-3 rounded-xl overflow-hidden border border-slate-200 shadow-sm w-fit max-w-full">
                    <img src={url} alt="Attachment" className="max-w-xs md:max-w-md max-h-[300px] object-cover hover:opacity-90 transition-opacity" />
                </a>
            );
        }

        return (
            <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-3 mt-3 p-3 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow w-fit border border-slate-200">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <FileText size={20} />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-700">Eklenmiş Dosya</span>
                    <span className="text-xs font-medium text-slate-500">Tıklayıp Görüntüle</span>
                </div>
            </a>
        );
    };

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

    return (
        <div className="flex flex-col h-full bg-slate-50 relative rounded-2xl overflow-hidden shadow-sm border border-slate-200" style={{ maxHeight: '85vh' }}>
            {/* Thread Header */}
            <div className="bg-white px-6 py-4 border-b border-slate-200 shrink-0 shadow-sm z-10 sticky top-0">
                <div className="flex items-center gap-4 mb-3">
                    <Button variant="outline" size="icon" onClick={onBack} className="h-9 w-9 rounded-xl border-slate-200 hover:bg-slate-100 hover:text-slate-900 shrink-0">
                        <ArrowLeft size={18} />
                    </Button>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-bold text-slate-900 line-clamp-1 truncate pr-4">{ticket.subject}</h2>
                        <div className="flex items-center gap-3 mt-1.5 overflow-x-auto pb-1 no-scrollbar">
                            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0 whitespace-nowrap">
                                Kategori: {formatCategory(ticket.category)}
                            </span>
                            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0 whitespace-nowrap">
                                Ticket No: #{ticket.id.split('-')[0]}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {ticket.status !== 'closed' && role === 'tenant' && (
                            <Button onClick={handleCloseTicket} variant="outline" className="border-green-300 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 font-bold gap-2 h-10 px-4 rounded-xl shadow-sm">
                                <CheckCircle2 size={18} />
                                <span className="hidden sm:inline">Çözüldü Olarak Kapat</span>
                            </Button>
                        )}
                        {role === 'admin' && (
                            <Button onClick={() => markTicketStatus(ticket.id, ticket.status === 'closed' ? 'open' : 'closed')} variant="outline" className="h-10 font-bold rounded-xl border-slate-300">
                                {ticket.status === 'closed' ? 'Talebi Tekrar Aç' : 'Talebi Kapat (Zorla)'}
                            </Button>
                        )}
                        <Button
                            onClick={handleDeleteTicket}
                            variant="outline"
                            className="border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 hover:border-red-300 h-10 w-10 p-0 rounded-xl shadow-sm shrink-0"
                            title="Talebi Sil (Kalıcı)"
                        >
                            <Trash2 size={18} />
                        </Button>
                    </div>
                </div>

                {role === "tenant" && ticket.status !== 'closed' && messages.length > 1 && (
                    <div className="bg-orange-50/80 border border-orange-200 px-4 py-3 rounded-xl flex items-start gap-4 mt-2">
                        <AlertCircle size={20} className="text-orange-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-orange-900 font-medium leading-relaxed">
                            Bu bilet için sistem uzmanlarımız yanıt verdi. Talebinizin çözüme ulaştığını düşünüyorsanız, lütfen sağ üstteki <strong>"Çözüldü Olarak Kapat"</strong> butonuna tıklayarak işlemi sonlandırınız. Yardıma ihtiyacınız varsa mesaja devam edebilirsiniz.
                        </p>
                    </div>
                )}
            </div>

            {/* Thread Body (Forum/Ticket style, not chat bubbles) */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth bg-slate-50/50"
            >
                {messages.map((msg, i) => {
                    const isAdmin = msg.sender_type === 'admin';
                    const isFirst = i === 0;

                    return (
                        <div key={msg.id} className={clsx(
                            "flex flex-col p-5 rounded-2xl shadow-sm border",
                            isAdmin
                                ? "bg-orange-50/30 border-orange-100/60 ml-0 md:ml-12"
                                : "bg-white border-slate-200 mr-0 md:mr-12"
                        )}>
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className={clsx(
                                        "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-inner border border-white/20 shrink-0 overflow-hidden",
                                        isAdmin ? "bg-white p-1" : "bg-slate-800 text-white"
                                    )}>
                                        {isAdmin ? (
                                            <img src="/uppy-logo-small.png" alt="UP" className="w-full h-full object-contain" />
                                        ) : ticket.profiles?.avatar_url ? (
                                            <img src={ticket.profiles.avatar_url} alt="MŞ" className="w-full h-full object-cover" />
                                        ) : (
                                            <span>MŞ</span>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className={clsx("font-bold text-[15px] flex items-center flex-wrap gap-1.5", isAdmin ? "text-orange-900" : "text-slate-800")}>
                                            {isAdmin ? (
                                                'Müşteri Destek Uzmanı'
                                            ) : (
                                                <>
                                                    <span>
                                                        {Array.isArray(ticket.tenants?.billing_info)
                                                            ? ticket.tenants?.billing_info[0]?.company_name
                                                            : ticket.tenants?.billing_info?.company_name || ticket.tenants?.name || 'İşletme Yetkilisi'}
                                                    </span>
                                                    {ticket.profiles?.full_name && (
                                                        <span className="font-medium text-sm text-slate-500 ml-1">
                                                            ({ticket.profiles.full_name} - Hesap Sahibi)
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                            {isFirst && <span className="ml-1.5 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-slate-200">Talep Sahibi</span>}
                                        </h4>
                                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mt-0.5">
                                            <Clock size={12} className="opacity-70" />
                                            {new Date(msg.created_at).toLocaleString('tr-TR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pl-0 md:pl-13 text-[15px] leading-relaxed text-slate-700 whitespace-pre-wrap">
                                {msg.message}
                            </div>

                            {
                                msg.attachment_url && (
                                    <div className="pl-0 md:pl-13 mt-4">
                                        {renderAttachment(msg.attachment_url)}
                                    </div>
                                )
                            }
                        </div>
                    );
                })}
            </div>

            {/* Input Area */}
            <div className="bg-white p-4 md:p-6 border-t border-slate-200 shadow-[0_-4px_15px_-5px_rgba(0,0,0,0.05)] z-20 shrink-0">
                {ticket.status === 'closed' ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center flex flex-col items-center gap-3">
                        <CheckCircle2 size={32} className="text-slate-400" />
                        <p className="text-sm font-semibold text-slate-600">
                            Bu talep başarıyla kapatılmış ve çözülmüş görünmektedir.
                        </p>
                        <p className="text-xs text-slate-500">
                            Konu halen çözülmediyse veya yeni bir sorununuz varsa <strong className="text-slate-700">yeni bir yanıt göndererek</strong> talebi tekrar incelemeye açabilirsiniz.
                        </p>
                    </div>
                ) : null}

                <div className={clsx("relative rounded-2xl border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-orange-500/30 focus-within:border-orange-500 transition-all shadow-sm overflow-hidden", ticket.status === 'closed' && "mt-4")}>
                    {file && (
                        <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                            <div className="flex items-center gap-2">
                                <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm text-slate-500">
                                    <Paperclip size={14} />
                                </div>
                                <span className="text-sm truncate font-semibold text-slate-700 max-w-[200px] md:max-w-md">{file.name}</span>
                            </div>
                            <button onClick={() => setFile(null)} className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg text-slate-400 transition-colors font-medium text-xs flex items-center gap-1">
                                <X size={14} /> Sil
                            </button>
                        </div>
                    )}

                    <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Yanıtınızı buraya yazın..."
                        className="w-full min-h-[100px] max-h-[250px] p-4 bg-transparent resize-y focus:outline-none text-[15px] leading-relaxed text-slate-800 placeholder:text-slate-400"
                        disabled={sending}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.ctrlKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />

                    <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors border border-transparent hover:border-orange-200"
                                disabled={sending}
                                title="Görüntü/Dosya Ekle"
                            >
                                <ImageIcon size={18} />
                                <span className="hidden sm:inline">Dosya Ekle</span>
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                                className="hidden"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="text-[11px] font-medium text-slate-400 hidden md:inline">
                                Göndermek için <kbd className="px-1.5 py-0.5 border border-slate-200 rounded-md bg-white font-sans mx-0.5">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 border border-slate-200 rounded-md bg-white font-sans mx-0.5">Enter</kbd>
                            </span>
                            <Button
                                onClick={handleSend}
                                disabled={sending || (!newMessage.trim() && !file)}
                                className={clsx(
                                    "rounded-xl h-10 px-5 font-bold shadow-sm flex items-center gap-2 transition-all",
                                    "bg-orange-600 hover:bg-orange-700 text-white"
                                )}
                            >
                                {sending ? "Gönderiliyor..." : "Yanıtı Gönder"}
                                {!sending && <Send size={16} />}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
