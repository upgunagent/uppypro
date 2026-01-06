"use client";


import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendMessage, toggleMode } from "@/app/actions/chat";
import { Send, Bot, User } from "lucide-react";
import { clsx } from "clsx";

interface Message {
    id: string;
    text: string;
    sender: "CUSTOMER" | "BOT" | "HUMAN";
    created_at: string;
    message_type?: string;
    media_url?: string;
}

interface ChatInterfaceProps {
    conversationId: string;
    initialMessages: Message[];
    conversationMode: "BOT" | "HUMAN";
    aiOperational: boolean;
}

export default function ChatInterface({ conversationId, initialMessages, conversationMode, aiOperational }: ChatInterfaceProps) {
    const [messages, setMessages] = useState(initialMessages);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom on load/new message
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Realtime Subscription
    useEffect(() => {
        console.log("Setting up Realtime subscription for conversation:", conversationId);
        const supabase = createClient();
        const channel = supabase
            .channel(`chat:${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`
                },
                (payload) => {
                    console.log("Realtime Payload Received:", payload);
                    const newMsg = payload.new as Message;
                    setMessages((prev) => {
                        // Prevent duplicates (simple check by ID)
                        if (prev.some(m => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });
                }
            )
            .subscribe((status, err) => {
                console.log(`Realtime Subscription Status: ${status}`, err);
            });

        return () => {
            console.log("Cleaning up Realtime subscription");
            supabase.removeChannel(channel);
        };
    }, [conversationId]);

    // TURBO POLLING FALLBACK (Chat): Updates messages every 2s if realtime fails
    useEffect(() => {
        if (!conversationId) return;
        const interval = setInterval(() => {
            const supabase = createClient();
            supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true })
                .then(({ data }) => {
                    if (data) {
                        setMessages(prev => {
                            if (data.length !== prev.length) return data;
                            // optimistically assume equal length means no change for speed
                            return prev;
                        });
                    }
                });
        }, 2000);
        return () => clearInterval(interval);
    }, [conversationId]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || sending) return;

        setSending(true);
        const optimisticMsg: Message = {
            id: "temp-" + Date.now(),
            text: input,
            sender: "HUMAN",
            created_at: new Date().toISOString()
        };
        setMessages((prev) => [...prev, optimisticMsg]);
        setInput("");

        try {
            await sendMessage(conversationId, optimisticMsg.text);
            // In real app, we'd wait for revalidation or subscription update
        } catch (err) {
            console.error("Failed to send", err);
        } finally {
            setSending(false);
        }
    };

    const handleToggle = async () => {
        try {
            await toggleMode(conversationId, conversationMode);
        } catch (err) {
            console.error("Toggle failed", err);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            {/* Header / Toolbar */}
            <div className="flex justify-between items-center p-4 border-b border-white/10 bg-white/5 rounded-t-xl">
                <div className="flex items-center gap-2">
                    <div className={clsx("w-3 h-3 rounded-full", conversationMode === "BOT" ? "bg-purple-500 shadow-purple-500/50 shadow-lg" : "bg-blue-500")}></div>
                    <span className="font-bold text-sm">{conversationMode === "BOT" ? "AI Modu Aktif" : "Manuel Mod (Human)"}</span>
                </div>

                <Button
                    variant={conversationMode === "BOT" ? "secondary" : "default"}
                    size="sm"
                    onClick={handleToggle}
                    disabled={!aiOperational}
                    className={clsx(!aiOperational && "opacity-50 cursor-not-allowed")}
                >
                    {conversationMode === "BOT" ? <><User className="mr-2 w-4 h-4" />Devral (Human)</> : <><Bot className="mr-2 w-4 h-4" />AI'ya Devret</>}
                </Button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20" ref={scrollRef}>
                {messages.map((msg) => {
                    const isMe = msg.sender === "HUMAN";
                    const isBot = msg.sender === "BOT";
                    return (
                        <div key={msg.id} className={clsx("flex flex-col max-w-[70%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                            {/* Sender Label */}
                            <span className="text-xs text-gray-500 mb-1 ml-1">
                                {isMe ? "Siz" : isBot ? "AI Bot" : "Müşteri"}
                            </span>

                            {/* Bubble */}
                            <div className={clsx(
                                "px-4 py-2 rounded-2xl text-sm overflow-hidden",
                                isMe
                                    ? "bg-primary text-white rounded-br-none"
                                    : isBot
                                        ? "bg-purple-600/20 border border-purple-500/30 text-purple-100 rounded-bl-none"
                                        : "bg-white/10 text-gray-200 rounded-bl-none"
                            )}>
                                {/* MEDIA CONTENT */}
                                {msg.message_type === 'image' && msg.media_url ? (
                                    <div className="-mx-2 -mt-2 mb-2">
                                        <img
                                            src={msg.media_url}
                                            alt="Gelen Fotoğraf"
                                            className="max-w-[240px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => window.open(msg.media_url, '_blank')}
                                        />
                                    </div>
                                ) : msg.message_type === 'video' && msg.media_url ? (
                                    <div className="-mx-2 -mt-2 mb-2">
                                        <video
                                            src={msg.media_url}
                                            controls
                                            className="max-w-[240px] rounded-lg"
                                        />
                                    </div>
                                ) : msg.message_type === 'audio' && msg.media_url ? (
                                    <div className="mb-1 min-w-[200px]">
                                        <audio
                                            src={msg.media_url}
                                            controls
                                            className="w-full h-8"
                                        />
                                    </div>
                                ) : null}

                                {/* TEXT CONTENT */}
                                {msg.text && <div className="whitespace-pre-wrap">{msg.text}</div>}
                            </div>

                            {/* Time */}
                            <span className="text-[10px] text-gray-600 mt-1 mr-1">
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-4 bg-white/5 border-t border-white/10 rounded-b-xl flex gap-2">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Mesaj yazın..."
                    className="flex-1 bg-black/20 border-white/10"
                />
                <Button type="submit" disabled={sending || conversationMode === 'BOT'}>
                    <Send className="w-4 h-4" />
                </Button>
            </form>
            {conversationMode === 'BOT' && (
                <div className="text-center text-xs text-purple-400 mt-2">
                    ⚠️ Şu an AI yanıtlıyor. Müdahale etmek için "Human" moduna geçin.
                </div>
            )}
        </div>
    );
}
