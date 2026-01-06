"use client";

import Link from "next/link";
import { MessageCircle, Instagram } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Message {
    text: string;
    created_at: string;
    message_type?: string;
    media_url?: string;
}

interface Conversation {
    id: string;
    channel: string;
    customer_handle: string;
    external_thread_id: string;
    mode: string;
    updated_at: string;
    messages: Message[];
}

interface ConversationListProps {
    initialConversations: Conversation[];
    tenantId: string;
}

export function ConversationList({ initialConversations, tenantId }: ConversationListProps) {
    const [conversations, setConversations] = useState<Conversation[]>(
        Array.isArray(initialConversations) ? initialConversations : []
    );

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
                            console.log("New conversation detected, fetching:", newMsg.conversation_id);

                            supabase
                                .from('conversations')
                                .select('*')
                                .eq('id', newMsg.conversation_id)
                                .single()
                                .then(({ data: newConvData, error }) => {
                                    if (newConvData && !error) {
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
    }, [tenantId]);

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
            supabase
                .from('conversations')
                .select(`*, messages(text, created_at, message_type, media_url)`)
                .eq('tenant_id', tenantId)
                .order('updated_at', { ascending: false })
                .limit(15)
                .then(({ data, error }) => {
                    if (error) {
                        setDebugError(error.message);
                    } else if (data) {
                        setDebugError(null); // Clear previous errors
                        setConversations(prev => {
                            const newDataSig = JSON.stringify(data.map((c: any) => c.id + c.updated_at));
                            const prevDataSig = JSON.stringify(prev.slice(0, 15).map(c => c.id + c.updated_at));

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
    }, [tenantId]);

    return (
        <div className="flex-1 overflow-y-auto space-y-2">
            {/* CRITICAL DEBUG PANEL */}
            <div className="bg-red-900/80 border border-red-500 p-3 rounded mb-2 text-xs font-mono text-red-100">
                <div className="flex justify-between font-bold text-lg mb-1">
                    <span>⚠️ DEBUG MODE v2.0</span>
                    <button onClick={() => window.location.reload()} className="bg-white text-red-900 px-2 rounded">REFRESH</button>
                </div>
                <div>Tenant ID: {tenantId || "UNDEFINED"}</div>
                <div>Last Poll: {lastPoll}</div>
                <div>Conv Count: {conversations.length}</div>
                {debugError && <div className="text-yellow-300 font-bold">ERROR: {debugError}</div>}
            </div>

            {conversations.map((conv) => {
                const msgs = Array.isArray(conv.messages) ? conv.messages : [];
                const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;

                // Safe date format
                let timeStr = "";
                try {
                    timeStr = conv.updated_at ? new Date(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
                } catch (e) { timeStr = "Invalid Date"; }

                return (
                    <Link key={conv.id} href={`/panel/chat/${conv.id}`}>
                        <div className="p-4 glass rounded-lg border border-white/5 hover:bg-white/10 transition-colors flex items-center justify-between cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className="bg-white/10 p-3 rounded-full">
                                    {conv.channel === 'whatsapp'
                                        ? <MessageCircle className="text-green-500" />
                                        : <Instagram className="text-pink-500" />
                                    }
                                </div>
                                <div>
                                    <div className="font-bold text-lg">
                                        {safeString(conv.customer_handle || conv.external_thread_id)}
                                    </div>
                                    <div className="text-sm text-gray-400 capitalize flex items-center gap-2">
                                        {conv.mode === 'BOT' && <span className="bg-purple-500/20 text-purple-400 text-xs px-1.5 py-0.5 rounded">BOT</span>}
                                        {/* SAFE RENDER: Ensure text is string */}
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
                                    </div>
                                </div>
                            </div>
                            <div className="text-xs text-gray-500">
                                {timeStr}
                            </div>
                        </div>
                    </Link>
                );
            })}
            {conversations.length === 0 && (
                <div className="text-center text-gray-500 mt-24">
                    Bu filtrede hiç konuşma yok.
                </div>
            )}
        </div>
    );
}
