"use client";

import Link from "next/link";
import { MessageCircle, Instagram, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
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
                    const newMsg = payload.new;
                    console.log("Inbox Realtime Update (No Filter):", newMsg);

                    // Double check tenant_id just in case RLS leaked (shouldn't happen)
                    if (newMsg.tenant_id !== tenantId) return;

                    setConversations((prev) => {
                        const existingIdx = prev.findIndex(c => c.id === newMsg.conversation_id);

                        if (existingIdx !== -1) {
                            console.log("Updating existing conversation:", newMsg.conversation_id);
                            // Move to top and update last message
                            const updatedConv = { ...prev[existingIdx] };

                            // Safe create object
                            const msgObj = {
                                text: safeString(newMsg.text),
                                created_at: safeString(newMsg.created_at),
                                message_type: newMsg.message_type,
                                media_url: newMsg.media_url
                            };

                            // Naively append
                            updatedConv.messages = [...(updatedConv.messages || []), msgObj];
                            updatedConv.updated_at = newMsg.created_at;

                            const newList = [...prev];
                            newList.splice(existingIdx, 1);
                            return [updatedConv, ...newList];
                        } else {
                            // NEW CONVERSATION: Fetch it!
                            // If current tab is 'whatsapp' but message is 'instagram', we might exclude it?
                            // But usually real-time should probably show it, or maybe strict filter.
                            // For flexibility, we'll fetch and let local filter (if we added one) handle it.
                            // However, we rely on parent passing initialConversations filtered by server.
                            // So if we are in 'whatsapp' tab and receive 'instagram' msg, we should probably check channel.

                            console.log("New conversation detected, fetching:", newMsg.conversation_id);

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
                                                    media_url: newMsg.media_url
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
                console.log("Inbox Subscription Status:", status);
            });

        return () => {
            console.log("Unsubscribing from inbox-list");
            supabase.removeChannel(channel);
        };
    }, [tenantId, currentTab]);

    // TURBO HYBRID MODE with VISIBLE DIAGNOSTICS
    useEffect(() => {
        const interval = setInterval(() => {
            const time = new Date().toLocaleTimeString();
            setLastPoll(time);

            if (!tenantId) {
                setDebugError("Tenant ID is MISSING!");
                return;
            }

            const supabase = createClient();
            let query = supabase
                .from('conversations')
                .select(`*, messages(*)`) // Select all from messages to ensure we get created_at
                .eq('tenant_id', tenantId)
                .order('updated_at', { ascending: false })
                .order('created_at', { foreignTable: 'messages', ascending: true }) // Explicit Sort
                .limit(15);

            if (currentTab !== 'all') {
                query = query.eq('channel', currentTab);
            }

            query.then(({ data, error }) => {
                if (error) {
                    setDebugError(error.message);
                } else if (data) {
                    setDebugError(null); // Clear previous errors
                    setConversations(prev => {
                        // Create a deeper signature that includes message read status
                        const newDataSig = JSON.stringify(data.map((c: any) => {
                            const msgs = c.messages || [];
                            const unread = msgs.filter((m: any) => m.direction === 'IN' && !m.is_read).length;
                            return c.id + c.updated_at + unread + (c.profile_pic || ''); // Include profile_pic update in signature
                        }));

                        const prevDataSig = JSON.stringify(prev.slice(0, 15).map(c => {
                            const msgs = c.messages || [];
                            const unread = msgs.filter((m) => m.direction === 'IN' && !m.is_read).length;
                            return c.id + c.updated_at + unread + (c.profile_pic || '');
                        }));

                        if (newDataSig !== prevDataSig) {
                            return data.map((d: any) => ({
                                ...d,
                                messages: d.messages || []
                            }));
                        }
                        return prev;
                    });
                }
            });
        }, 2000);

        return () => clearInterval(interval);
    }, [tenantId, currentTab]);

    // Construct URL for conversation item
    const getConversationUrl = (convId: string) => {
        return `/panel/inbox?tab=${currentTab}&chatId=${convId}`;
    };

    return (
        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {/* Debug removed: System Stable */}

            <AnimatePresence initial={false} mode='popLayout'>
                {conversations.map((conv) => {
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
                            <Link href={getConversationUrl(conv.id)} className="block relative group">
                                <div className={clsx(
                                    "p-4 rounded-xl border transition-all flex items-center justify-between cursor-pointer pr-12 relative overflow-hidden shadow-md group-hover:shadow-lg duration-200",
                                    conv.channel === 'instagram'
                                        ? "bg-gradient-to-r from-red-500 via-red-700 to-rose-900 border-transparent shadow-red-500/20 text-white"
                                        : conv.channel === 'whatsapp'
                                            ? "bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 border-transparent shadow-green-500/20 text-white"
                                            : (isSelected ? "bg-slate-50 border-primary ring-1 ring-primary/20 text-slate-900" : "bg-white border-slate-100 text-slate-900 hover:border-slate-300")
                                )}>

                                    {/* Selection Ring for Gradient Cards */}
                                    {isSelected && (conv.channel === 'instagram' || conv.channel === 'whatsapp') && (
                                        <div className="absolute inset-0 border-[3px] border-white/40 rounded-xl pointer-events-none" />
                                    )}

                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className={clsx(
                                            "rounded-full flex items-center justify-center shrink-0 w-12 h-12 border shadow-sm backdrop-blur-sm",
                                            (conv.channel === 'instagram' || conv.channel === 'whatsapp')
                                                ? "bg-white/20 border-white/30"
                                                : "bg-slate-50 border-slate-200"
                                        )}>
                                            {conv.channel === 'whatsapp' ? (
                                                <MessageCircle className={clsx("w-6 h-6", (conv.channel === 'whatsapp') ? "text-white" : "text-green-600")} />
                                            ) : (
                                                conv.profile_pic ? (
                                                    <img
                                                        src={conv.profile_pic}
                                                        alt="Profile"
                                                        className="w-full h-full object-cover rounded-full"
                                                    />
                                                ) : (
                                                    <Instagram className={clsx("w-6 h-6", (conv.channel === 'instagram') ? "text-white" : "text-pink-600")} />
                                                )
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className={clsx("flex items-center gap-1.5 font-bold text-lg", (conv.channel === 'instagram' || conv.channel === 'whatsapp') ? "text-white" : "text-slate-800")}>
                                                <span className="truncate">{safeString(conv.customer_handle || conv.external_thread_id)}</span>
                                                {conv.channel === 'instagram' && (
                                                    <Instagram size={16} className="text-white/90 shrink-0" />
                                                )}
                                            </div>
                                            <div className={clsx("text-sm capitalize flex items-center gap-2", (conv.channel === 'instagram' || conv.channel === 'whatsapp') ? "text-white/90" : "text-slate-500")}>
                                                {conv.mode === 'BOT' && <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-md uppercase tracking-wide font-bold">BOT</span>}
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
                                            const isColored = conv.channel === 'instagram' || conv.channel === 'whatsapp';

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
                                        <span className={clsx("text-xs font-medium", (conv.channel === 'instagram' || conv.channel === 'whatsapp') ? "text-white/80" : "text-slate-400")}>{timeStr}</span>
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
                            </Link>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
            {
                conversations.length === 0 && (
                    <div className="text-center text-gray-500 mt-24">
                        Bu filtrede hiç konuşma yok.
                    </div>
                )
            }
        </div >
    );
}
