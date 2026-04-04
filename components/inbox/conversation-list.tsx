"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageCircle, Instagram, Trash2, Search, MessageSquare, Globe } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { deleteConversation } from "@/app/actions/chat";
import { clsx } from "clsx";
import { AnimatePresence, motion } from "framer-motion";

interface Message {
    text: string;
    created_at: string;
    message_type?: string;
    media_url?: string;
    is_read?: boolean;
    direction?: 'IN' | 'OUT';
}

interface Conversation {
    id: string;
    channel: string;
    customer_handle: string;
    external_thread_id: string;
    mode: string;
    updated_at: string;
    messages: Message[];
    profile_pic?: string;
}

interface ConversationListProps {
    initialConversations: Conversation[];
    tenantId: string;
    currentTab?: string;
    selectedChatId?: string;
}

export function ConversationList({ initialConversations, tenantId, currentTab = 'all', selectedChatId }: ConversationListProps) {
    const router = useRouter();
    const [conversations, setConversations] = useState<Conversation[]>(
        Array.isArray(initialConversations) ? initialConversations : []
    );

    // Update conversations when initialConversations changes (e.g. tab switch)
    useEffect(() => {
        if (Array.isArray(initialConversations)) {
            setConversations(initialConversations);
        }
    }, [initialConversations]);

    // DIAGNOSTIC STATE
    const [lastPoll, setLastPoll] = useState<string>("Not started");
    const [debugError, setDebugError] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState("");

    // Helper for safe rendering
    const safeString = (val: any): string => {
        if (typeof val === 'string') return val;
        if (typeof val === 'number') return String(val);
        if (val === null || val === undefined) return '';
        try {
            return JSON.stringify(val);
        } catch (e) {
            return 'Invalid Data';
        }
    };

    const filteredConversations = useMemo(() => {
        if (!searchQuery.trim()) return conversations;
        const lowerQ = searchQuery.toLowerCase();
        return conversations.filter(c => {
            const handle = safeString(c.customer_handle).toLowerCase();
            const threadId = safeString(c.external_thread_id).toLowerCase();
            return handle.includes(lowerQ) || threadId.includes(lowerQ);
        });
    }, [conversations, searchQuery]);

    useEffect(() => {
        const supabase = createClient();
        console.log("Subscribing to inbox-list for tenant:", tenantId);

        // Subscribe to NEW messages
        // REMOVED FILTER: Relying on RLS to filter for us.
        const channel = supabase
            .channel(`inbox-list:${tenantId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages'
                },
                async (payload) => {
                    const newMsg = payload.new as any;
                    // console.log("Inbox Realtime Update (No Filter):", newMsg);

                    // Double check tenant_id just in case RLS leaked (shouldn't happen)
                    if (newMsg.tenant_id !== tenantId) return;

                    setConversations((prev) => {
                        const existingIdx = prev.findIndex(c => c.id === newMsg.conversation_id);

                        if (existingIdx !== -1) {
                            // console.log("Updating existing conversation:", newMsg.conversation_id);
                            // Move to top and update last message
                            const updatedConv = { ...prev[existingIdx] };

                            // Safe create object
                            const msgObj: Message = {
                                text: safeString(newMsg.text),
                                created_at: safeString(newMsg.created_at),
                                message_type: newMsg.message_type,
                                media_url: newMsg.media_url,
                                direction: newMsg.direction,
                                is_read: newMsg.is_read
                            };

                            // Naively append
                            updatedConv.messages = [...(updatedConv.messages || []), msgObj];
                            updatedConv.updated_at = newMsg.created_at;

                            const newList = [...prev];
                            newList.splice(existingIdx, 1);
                            return [updatedConv, ...newList];
                        } else {
                            // NEW CONVERSATION: Fetch it!
                            // console.log("New conversation detected, fetching:", newMsg.conversation_id);

                            supabase
                                .from('conversations')
                                .select('*')
                                .eq('id', newMsg.conversation_id)
                                .single()
                                .then(({ data: newConvData, error }) => {
                                    if (newConvData && !error) {
                                        // Filter check if tab is specific
                                        if (currentTab !== 'all' && newConvData.channel !== currentTab) {
                                            return; // Don't add to list if it doesn't match current filter
                                        }

                                        setConversations(current => {
                                            if (current.some(c => c.id === newConvData.id)) return current;

                                            const newConv: Conversation = {
                                                ...newConvData,
                                                messages: [{
                                                    text: safeString(newMsg.text),
                                                    created_at: safeString(newMsg.created_at),
                                                    message_type: newMsg.message_type,
                                                    media_url: newMsg.media_url,
                                                    direction: newMsg.direction,
                                                    is_read: newMsg.is_read
                                                }]
                                            };
                                            return [newConv, ...current];
                                        });
                                    }
                                });

                            return prev;
                        }
                    });
                }
            )
            .subscribe((status) => {
                // console.log("Inbox Subscription Status:", status);
            });

        return () => {
            // console.log("Unsubscribing from inbox-list");
            supabase.removeChannel(channel);
        };
    }, [tenantId, currentTab]);

    // Fast Polling ( Turbo Polling ) to ensure list is strictly up to date
    useEffect(() => {
        const fetchConversations = async () => {
            const supabase = createClient();
            let query = supabase
                .from("conversations")
                .select("*, messages(*)")
                .eq("tenant_id", tenantId)
                .order("updated_at", { ascending: false });

            if (currentTab !== "all") {
                query = query.eq("channel", currentTab);
            }

            const { data } = await query;
            if (data && data.length > 0) {
                // Mevcut profil fotoğraflarını koru (sunucu tarafında birleştirilmiş olanlar)
                setConversations(prev => {
                    const existingPicMap: Record<string, string> = {};
                    prev.forEach(c => {
                        if (c.profile_pic) existingPicMap[c.id] = c.profile_pic;
                    });
                    return (data as Conversation[]).map(conv => ({
                        ...conv,
                        profile_pic: conv.profile_pic || existingPicMap[conv.id] || undefined
                    }));
                });
            }
        };

        const interval = setInterval(fetchConversations, 4000);
        return () => clearInterval(interval);
    }, [tenantId, currentTab]);

    // URL Constructor
    const getConversationUrl = (convId: string) => {
        return `/panel/inbox?tab=${currentTab}&chatId=${convId}`;
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header with Search and Tabs */}
            <div className="flex flex-col gap-3 p-4 border-b border-slate-200 shrink-0 bg-slate-50">
                {/* Desktop Title (Hidden on Mobile) */}
                <h1 className="text-xl font-bold hidden md:block">
                    {currentTab === 'all' && 'Tüm Mesajlar'}
                    {currentTab === 'whatsapp' && 'WhatsApp'}
                    {currentTab === 'instagram' && 'Instagram'}
                    {currentTab === 'webchat' && 'Web'}
                </h1>

                {/* Mobile Top Tabs (Hidden on Desktop) */}
                <div className="grid md:hidden grid-cols-3 gap-1.5 w-full">
                    <Link
                        href="/panel/inbox?tab=all"
                        className={clsx(
                            "flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all",
                            currentTab === 'all'
                                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25"
                                : "bg-orange-50 text-orange-600 border border-orange-200"
                        )}
                    >
                        <MessageSquare size={14} />
                        Mesajlar
                    </Link>
                    <Link
                        href="/panel/inbox?tab=whatsapp"
                        className={clsx(
                            "flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all",
                            currentTab === 'whatsapp'
                                ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25"
                                : "bg-green-50 text-green-600 border border-green-200"
                        )}
                    >
                        <MessageCircle size={14} />
                        WhatsApp
                    </Link>
                    <Link
                        href="/panel/inbox?tab=instagram"
                        className={clsx(
                            "flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all",
                            currentTab === 'instagram'
                                ? "bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 text-white shadow-lg shadow-pink-500/25"
                                : "bg-pink-50 text-pink-600 border border-pink-200"
                        )}
                    >
                        <Instagram size={14} />
                        Instagram
                    </Link>
                </div>

                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        name="search_conversations"
                        id="search_conversations"
                        autoComplete="off"
                        placeholder="Ara (Ad, Telefon)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 pl-9 pr-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 px-5 py-3 custom-scrollbar">

                <AnimatePresence initial={false} mode='popLayout'>
                    {filteredConversations.map((conv) => {
                        const msgs = Array.isArray(conv.messages) ? [...conv.messages] : [];
                        // Sort by created_at to ensure correct order for preview
                        msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                        const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
                        const isSelected = selectedChatId === conv.id;

                        // Safe date format
                        let timeStr = "";
                        try {
                            timeStr = conv.updated_at ? new Date(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
                        } catch (e) { timeStr = "Invalid Date"; }

                        return (
                            <motion.div
                                key={conv.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="mb-2"
                            >
                                <div
                                    onClick={() => {
                                        // Use Next.js router for seamless SPA navigation
                                        router.push(getConversationUrl(conv.id));
                                    }}
                                    className="block relative group cursor-pointer"
                                >
                                    <div className={clsx(
                                        "p-2.5 md:p-4 rounded-xl transition-all flex items-center justify-between cursor-pointer pr-10 md:pr-12 relative overflow-hidden group-hover:shadow-lg duration-200",
                                        isSelected ? "scale-[1.03] shadow-2xl z-20 border-[3px] border-slate-900" : "border shadow-md hover:scale-[1.02] active:scale-[0.98]",
                                        conv.channel === 'instagram'
                                            ? "bg-gradient-to-r from-red-500 via-red-700 to-rose-900 text-white"
                                            : conv.channel === 'whatsapp'
                                                ? "bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white"
                                                : conv.channel === 'webchat'
                                                    ? "bg-gradient-to-r from-violet-500 via-purple-600 to-indigo-600 text-white"
                                                    : (isSelected ? "bg-slate-50 text-slate-900" : "bg-white border-slate-100 text-slate-900 hover:border-slate-300"),
                                        ((conv.channel === 'instagram' || conv.channel === 'whatsapp' || conv.channel === 'webchat') && !isSelected) && "border-transparent",
                                        (conv.channel === 'instagram' && !isSelected) && "shadow-red-500/20",
                                        (conv.channel === 'whatsapp' && !isSelected) && "shadow-green-500/20",
                                        (conv.channel === 'webchat' && !isSelected) && "shadow-violet-500/20",
                                        (conv.channel === 'instagram' && isSelected) && "shadow-red-500/40",
                                        (conv.channel === 'whatsapp' && isSelected) && "shadow-green-500/40",
                                        (conv.channel === 'webchat' && isSelected) && "shadow-violet-500/40"
                                    )}>

                                        {/* Selection Ring for Gradient Cards */}
                                        {isSelected && (conv.channel === 'instagram' || conv.channel === 'whatsapp') && (
                                            <div className="absolute inset-0 border-[3px] border-white/40 rounded-xl pointer-events-none" />
                                        )}

                                        <div className="flex items-center gap-2.5 md:gap-4 flex-1 min-w-0">
                                            <div className={clsx(
                                                "rounded-full flex items-center justify-center shrink-0 w-9 h-9 md:w-12 md:h-12 border shadow-sm backdrop-blur-sm",
                                                (conv.channel === 'instagram' || conv.channel === 'whatsapp' || conv.channel === 'webchat')
                                                    ? "bg-white/20 border-white/30"
                                                    : "bg-slate-50 border-slate-200"
                                            )}>
                                                {conv.profile_pic ? (
                                                    <img
                                                        src={conv.profile_pic}
                                                        alt="Profile"
                                                        className="w-full h-full object-cover rounded-full"
                                                        referrerPolicy="no-referrer"
                                                    />
                                                ) : conv.channel === 'whatsapp' ? (
                                                    <MessageCircle className={clsx("w-4 h-4 md:w-6 md:h-6", "text-white")} />
                                                ) : conv.channel === 'webchat' ? (
                                                    <Globe className={clsx("w-4 h-4 md:w-6 md:h-6", "text-white")} />
                                                ) : (
                                                    <Instagram className={clsx("w-4 h-4 md:w-6 md:h-6", (conv.channel === 'instagram') ? "text-white" : "text-pink-600")} />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className={clsx("flex items-center gap-1.5 font-bold text-sm md:text-lg", (conv.channel === 'instagram' || conv.channel === 'whatsapp' || conv.channel === 'webchat') ? "text-white" : "text-slate-800")}>
                                                    <span className="truncate">{safeString(conv.customer_handle || conv.external_thread_id)}</span>
                                                    {conv.channel === 'instagram' && (
                                                        <Instagram size={16} className="text-white/90 shrink-0" />
                                                    )}
                                                </div>
                                                <div className={clsx("text-xs md:text-sm capitalize flex items-center gap-2", (conv.channel === 'instagram' || conv.channel === 'whatsapp' || conv.channel === 'webchat') ? "text-white/90" : "text-slate-500")}>
                                                    {conv.mode === 'BOT' && <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-md uppercase tracking-wide font-bold">AI</span>}
                                                    <span className="block truncate flex-1 font-medium opacity-90">
                                                        {(() => {
                                                            const txt = safeString(lastMsg?.text);
                                                            // Check for known media markers or types
                                                            if (txt === '[Photo]' || txt === '[Media]' || lastMsg?.message_type === 'image') return '📷 Fotoğraf';
                                                            if (txt === '[Video]' || lastMsg?.message_type === 'video') return '🎥 Video';
                                                            if (txt === '[Audio]' || lastMsg?.message_type === 'audio') return '🎤 Ses';
                                                            if (txt === '[Document]' || lastMsg?.message_type === 'document') return '📄 Belge';

                                                            // Fallback to text or generic
                                                            return lastMsg ? (txt || 'Görsel/Medya') : 'Konuşma başlatıldı';
                                                        })()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Read/Unread Status Badges */}
                                        <div className="flex flex-col items-end gap-1 px-2">
                                            {(() => {
                                                const msgs = Array.isArray(conv.messages) ? conv.messages : [];
                                                const unreadCount = msgs.filter(m => m.direction === 'IN' && !m.is_read).length;
                                                const isColored = conv.channel === 'instagram' || conv.channel === 'whatsapp' || conv.channel === 'webchat';

                                                if (unreadCount > 0) {
                                                    return (
                                                        <div className="flex items-center gap-2">
                                                            <span className={clsx("text-xs px-2 py-0.5 rounded font-bold shadow-sm", isColored ? "bg-white text-black" : "bg-green-100 text-green-700")}>
                                                                Yeni
                                                            </span>
                                                            <span className={clsx("flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full shadow-sm", isColored ? "bg-black/20 text-white border border-white/20" : "bg-green-500 text-white")}>
                                                                {unreadCount}
                                                            </span>
                                                        </div>
                                                    );
                                                } else {
                                                    return (
                                                        <span className={clsx("text-xs px-2 py-0.5 rounded font-medium", isColored ? "bg-black/10 text-white/90" : "bg-slate-100 text-slate-500")}>
                                                            Okundu
                                                        </span>
                                                    );
                                                }
                                            })()}
                                            <span className={clsx("text-xs font-medium", (conv.channel === 'instagram' || conv.channel === 'whatsapp' || conv.channel === 'webchat') ? "text-white/80" : "text-slate-400")}>{timeStr}</span>
                                        </div>
                                    </div>

                                    {/* Delete Button */}
                                    <button
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white text-red-500 hover:bg-red-500 hover:text-white rounded-full opacity-0 group-hover:opacity-100 transition-all z-20 shadow-lg scale-90 hover:scale-100"
                                        onClick={async (e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (confirm("Bu konuşmayı ve tüm mesajları silmek istediğinize emin misiniz?")) {
                                                try {
                                                    setConversations(prev => prev.filter(c => c.id !== conv.id));
                                                    await deleteConversation(conv.id);
                                                } catch (err) {
                                                    console.error("Delete failed", err);
                                                }
                                            }
                                        }}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
                {
                    filteredConversations.length === 0 && (
                        searchQuery ? (
                            <div className="text-center text-gray-500 mt-24">
                                Aramanızla eşleşen sonuç bulunamadı.
                            </div>
                        ) : currentTab === 'webchat' ? (
                            <div className="flex flex-col items-center justify-center mt-6 px-4">
                                <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-2xl overflow-hidden max-w-md w-full shadow-sm">
                                    {/* Header */}
                                    <div className="w-full bg-gradient-to-r from-violet-500 via-purple-600 to-indigo-600 p-8 text-center">
                                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30">
                                            <Globe className="w-8 h-8 text-white" />
                                        </div>
                                        <h3 className="text-xl font-bold text-white">Web Chat</h3>
                                        <p className="text-sm text-white/80 mt-1">Web sitenizden gelen mesajlar</p>
                                    </div>

                                    <div className="p-6 space-y-4">
                                        <p className="text-sm text-slate-600 leading-relaxed">
                                            Web sitenize entegre ettiginiz <strong>chatbot widget</strong> uzerinden gelen tum musteri mesajlari burada gorunecektir. AI asistanınız otomatik olarak yanitlayacak veya siz devralabileceksiniz.
                                        </p>

                                        <div className="bg-white rounded-xl p-4 border border-violet-100">
                                            <p className="text-sm font-semibold text-slate-700 mb-2">Nasil calisir?</p>
                                            <ul className="text-sm text-slate-600 leading-relaxed space-y-2">
                                                <li className="flex items-start gap-2">
                                                    <span className="text-violet-500 font-bold mt-0.5">1.</span>
                                                    <span>Admin sizin icin <strong>Webhook URL</strong> olusturur</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="text-violet-500 font-bold mt-0.5">2.</span>
                                                    <span>Bu URL&apos;yi web sitenizdeki chatbot widget&apos;iniza baglarsiniz</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="text-violet-500 font-bold mt-0.5">3.</span>
                                                    <span>Ziyaretciler yazdikca mesajlar burada gorunur, AI otomatik yanitlar</span>
                                                </li>
                                            </ul>
                                        </div>

                                        <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
                                            <p className="text-xs text-violet-700 leading-relaxed">
                                                Henuz web sitenizden bir mesaj gelmedi. Widget entegrasyonu tamamlandiginda, gelen mesajlar WhatsApp ve Instagram mesajlari gibi burada listelenecektir.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center mt-6 px-4">
                                <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-2xl overflow-hidden max-w-md w-full shadow-sm">
                                    {/* Banner Image */}
                                    <div className="w-full">
                                        <img
                                            src="/welcome-banner.png"
                                            alt="UppyPro Panel"
                                            className="w-full h-44 object-cover"
                                        />
                                    </div>

                                    <div className="p-6 space-y-4">
                                        <h3 className="text-xl font-bold text-slate-800 text-center">UppyPro&apos;ya Hoşgeldiniz!</h3>

                                        <p className="text-sm text-slate-600 leading-relaxed">
                                            Artık tüm <strong>WhatsApp</strong> ve <strong>Instagram</strong> mesajlarınızı tek bir panelden yönetebilir, 
                                            <strong> AI Asistan</strong> ile 7/24 otomatik yanıt verebilir, <strong>akıllı takvim</strong> ile randevularınızı takip edebilir 
                                            ve <strong>toplu mesaj</strong> gönderimleriyle müşterilerinize ulaşabilirsiniz.
                                        </p>

                                        <div className="bg-white rounded-xl p-4 border border-orange-100">
                                            <p className="text-sm font-semibold text-slate-700 mb-2">📲 İlk mesajınızı almak için:</p>
                                            <p className="text-sm text-slate-600 leading-relaxed">
                                                <strong>Ayarlar → İletişim Kanalları</strong> sekmesinden 
                                                WhatsApp ve Instagram hesaplarınızı kolayca bağlayabilirsiniz.
                                            </p>
                                        </div>

                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            💡 Bağlantı adımlarında, WhatsApp ve Instagram entegrasyonu için 
                                            <strong> adım adım görsel anlatım</strong> sizi yönlendirecektir.
                                            Sol üstteki logoyu kendi işletme logonuzla değiştirmek için 
                                            <strong> Ayarlar → Firma Bilgileri</strong> sayfasını ziyaret edin.
                                        </p>

                                        <Link
                                            href="/panel/settings"
                                            className="block w-full text-center bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-sm py-3 rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all shadow-md hover:shadow-lg"
                                        >
                                            İletişim Kanallarına Git →
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )
                    )
                }
            </div>
        </div>
    );
}
