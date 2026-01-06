"use client";

import Link from "next/link";
import { MessageCircle, Instagram } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Message {
    text: string;
    created_at: string;
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
        const channel = supabase
            .channel(`inbox-list:${tenantId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `tenant_id=eq.${tenantId}`
                },
                async (payload) => {
                    const newMsg = payload.new;
                    console.log("Inbox Realtime Update:", newMsg);

                    setConversations((prev) => {
                        const existingIdx = prev.findIndex(c => c.id === newMsg.conversation_id);

                        if (existingIdx !== -1) {
                            console.log("Updating existing conversation:", newMsg.conversation_id);
                            // Move to top and update last message
                            const updatedConv = { ...prev[existingIdx] };

                            // Safe create object
                            const msgObj = {
                                text: safeString(newMsg.text),
                                created_at: safeString(newMsg.created_at)
                            };

                            // Naively append
                            updatedConv.messages = [...(updatedConv.messages || []), msgObj];
                            updatedConv.updated_at = newMsg.created_at;

                            const newList = [...prev];
                            newList.splice(existingIdx, 1);
                            return [updatedConv, ...newList];
                        } else {
                            // New conversation logic omitted for MVP
                            return prev;
                        }
                    });
                }
            )
            .subscribe((status) => {
                console.log("Inbox Subscription Status:", status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tenantId]);

    return (
        <div className="flex-1 overflow-y-auto space-y-2">
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
                                        {lastMsg
                                            ? (safeString(lastMsg.text) || 'Görsel/Medya')
                                            : 'Konuşma başlatıldı'
                                        }
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
