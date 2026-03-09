"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, X, CheckCircle2, AlertCircle, FileText, Image as ImageIcon } from "lucide-react";
import { addTicketMessage, markTicketStatus, markAdminMessageAsRead, markUserMessageAsRead } from "@/app/actions/tickets";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface TicketChatProps {
    ticket: any;
    tenantId: string | null;
    userId: string | null;
    role: "tenant" | "admin";
    onBack: () => void;
}

export function TicketChat({ ticket, tenantId, userId, role, onBack }: TicketChatProps) {
    const [messages, setMessages] = useState<any[]>(ticket.ticket_messages || []);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Sync messages if ticket prop changes
    useEffect(() => {
        if (ticket.ticket_messages) {
            // Sort by created_at ascending
            const sorted = [...ticket.ticket_messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            setMessages(sorted);
        }
    }, [ticket]);

    // Mark as read when entering chat
    useEffect(() => {
        if (role === "tenant" && ticket.has_unread_admin_message) {
            markAdminMessageAsRead(ticket.id).catch(console.error);
        } else if (role === "admin" && ticket.has_unread_user_message) {
            markUserMessageAsRead(ticket.id).catch(console.error);
        }
    }, [ticket.id, role, ticket.has_unread_admin_message, ticket.has_unread_user_message]);

    // Scroll to bottom on load
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

            // To feel fast, we could optimistically update
            // However, the channel listener will update it shortly
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
        }
    };

    const renderAttachment = (url: string) => {
        const isImage = url.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) != null;

        if (isImage) {
            return (
                <a href={url} target="_blank" rel="noreferrer" className="block mt-2 rounded-lg overflow-hidden border border-slate-200">
                    <img src={url} alt="Attachment" className="max-w-[200px] max-h-[200px] object-cover hover:opacity-90 transition-opacity" />
                </a>
            );
        }

        return (
            <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-black/5 hover:bg-black/10 transition-colors w-fit border border-black/10">
                <FileText size={20} className="text-blue-600" />
                <span className="text-sm font-medium text-slate-700 underline underline-offset-2">Eklenen Dosyayı Görüntüle</span>
            </a>
        );
    };

    return (
        <div className="flex flex-col h-full bg-white relative">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 shadow-sm z-10 shrink-0">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
                        <X size={20} />
                    </Button>
                    <div>
                        <h2 className="font-bold text-slate-800 line-clamp-1">{ticket.subject}</h2>
                        <span className="text-xs font-medium text-slate-500">Talep No: #{ticket.id.split('-')[0]}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {ticket.status !== 'closed' && role === 'tenant' && (
                        <Button onClick={handleCloseTicket} variant="outline" className="border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 font-semibold gap-1.5 h-9 text-sm">
                            <CheckCircle2 size={16} />
                            <span className="hidden sm:inline">Çözüldü (Kapat)</span>
                        </Button>
                    )}
                    {role === 'admin' && (
                        <Button onClick={() => markTicketStatus(ticket.id, ticket.status === 'closed' ? 'open' : 'closed')} variant="outline" className="h-9">
                            {ticket.status === 'closed' ? 'Tekrar Aç' : 'Talebi Kapat'}
                        </Button>
                    )}
                </div>
            </div>

            {role === "tenant" && ticket.status !== 'closed' && messages.length > 1 && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-start gap-3 shrink-0">
                    <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800 font-medium">
                        Talebinizin çözüme ulaştığını düşünüyorsanız, lütfen sağ üstteki <strong>"Çözüldü (Kapat)"</strong> butonuna tıklayarak talebinizi kapatınız. Yardıma ihtiyacınız varsa adminimize cevap yazmaya devam edebilirsiniz.
                    </p>
                </div>
            )}

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth bg-slate-50/50"
            >
                {messages.map((msg, i) => {
                    // "admin" role means user is admin viewing it. "tenant" means user viewing it.
                    // If I am tenant, 'user' type is me. If I am admin, 'admin' type is me.
                    const isMe = (role === 'tenant' && msg.sender_type === 'user') || (role === 'admin' && msg.sender_type === 'admin');

                    return (
                        <div key={msg.id} className={clsx("flex flex-col max-w-[85%]", isMe ? "ml-auto items-end" : "items-start")}>
                            {!isMe && (
                                <span className="text-xs text-slate-500 mb-1 ml-1 font-semibold">
                                    {msg.sender_type === 'admin' ? 'Destek Ekibi (UppyPro)' : 'İşletme Yetkilisi'}
                                </span>
                            )}
                            <div className={clsx(
                                "px-4 py-3 rounded-2xl shadow-sm border",
                                isMe
                                    ? "bg-slate-900 text-white border-slate-800 rounded-tr-sm"
                                    : "bg-white text-slate-800 border-slate-200 rounded-tl-sm ring-1 ring-black/5"
                            )}>
                                <p className="text-[15px] whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                                {msg.attachment_url && renderAttachment(msg.attachment_url)}
                            </div>
                            <span className="text-[11px] text-slate-400 mt-1 px-1">
                                {new Date(msg.created_at).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    );
                })}
            </div>

            {ticket.status === 'closed' && role === 'tenant' && (
                <div className="p-4 bg-slate-100 border-t border-slate-200 text-center text-sm text-slate-600 rounded-lg mx-4 mb-4 shadow-sm border border-slate-200/60">
                    Bu talep kapatılmıştır. Konu tam olarak çözülmediyse veya yeni bir sorununuz varsa aşağıdan cevap yazarak talebi <strong>yeniden açabilirsiniz</strong>. Yeni bir konu ise soldaki <strong>Yeni Talep</strong> menüsünü kullanmanız önerilir.
                </div>
            )}

            <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                {file && (
                    <div className="flex items-center gap-2 mb-2 bg-slate-100 p-2 rounded-lg w-fit">
                        <Paperclip size={14} className="text-slate-500" />
                        <span className="text-sm truncate max-w-[200px] text-slate-700 font-medium">{file.name}</span>
                        <button onClick={() => setFile(null)} className="p-1 hover:bg-slate-200 rounded-full text-slate-500">
                            <X size={14} />
                        </button>
                    </div>
                )}
                <div className="flex items-end gap-2 relative shadow-sm ring-1 ring-slate-200 bg-white rounded-2xl p-1 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-1 transition-all">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                        disabled={sending}
                        title="Dosya Eklemek İçin Tıklayın"
                    >
                        <ImageIcon size={22} className="stroke-[2.5]" />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                        className="hidden"
                    />

                    <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Bir mesaj yazın..."
                        className="flex-1 max-h-32 min-h-[44px] py-3 px-2 bg-transparent resize-none focus:outline-none text-[15px]"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        disabled={sending}
                    />

                    <Button
                        onClick={handleSend}
                        disabled={sending || (!newMessage.trim() && !file)}
                        className="rounded-xl h-11 w-11 p-0 flex items-center justify-center m-1 shadow-sm"
                    >
                        <Send size={18} className={clsx("ml-0.5", sending && "opacity-50")} />
                    </Button>
                </div>
            </div>
        </div>
    );
}
