"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendMessage, toggleMode, editMessage, markConversationAsRead, deleteConversation, clearConversationMessages } from "@/app/actions/chat";
import { ContactInfoSheet } from "@/components/crm/contact-info-sheet";
import { Send, Bot, User, Smile, Paperclip, MoreVertical, Edit2, X, Check, MessageCircle, Instagram, ArrowDown, Trash2, Ban, Eraser, Menu } from "lucide-react";
import { clsx } from "clsx";
import { WavRecorder } from "@/lib/audio/wav-recorder";
import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react';

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
    platform: string;
    customerName: string;
    profilePic?: string;
}

export default function ChatInterface({ conversationId, initialMessages, conversationMode, aiOperational, platform, customerName, profilePic }: ChatInterfaceProps) {
    const router = useRouter();
    const [messages, setMessages] = useState(initialMessages);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [lightboxMedia, setLightboxMedia] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [activeProfilePic, setActiveProfilePic] = useState<string | undefined>(profilePic);

    // Scroll Logic State
    const [showScrollButton, setShowScrollButton] = useState(false);
    const isAtBottomRef = useRef(true);
    const prevMessageCountRef = useRef(initialMessages.length);

    // CRM UI State
    const [menuOpen, setMenuOpen] = useState(false);
    const [contactSheetOpen, setContactSheetOpen] = useState(false);

    const handleScroll = () => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        // User is at bottom if they are within 150px of the end
        const isBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 150;
        isAtBottomRef.current = isBottom;

        if (isBottom) {
            setShowScrollButton(false);
        }
    };

    // 1. Message Prop Sync
    useEffect(() => {
        setMessages(initialMessages);
    }, [initialMessages]);

    // 2. Conversation Init (Profile Pic + Fresh Fetch)
    useEffect(() => {
        setActiveProfilePic(profilePic);
        markConversationAsRead(conversationId);

        const fetchFreshKeys = async () => {
            const supabase = createClient();

            // 1. Messages 
            const { data: msgs } = await supabase
                .from("messages")
                .select("*")
                .eq("conversation_id", conversationId)
                .order("created_at", { ascending: true });

            if (msgs) {
                setMessages(msgs);
            }

            // 2. Profile Pic 
            const { data: conv } = await supabase
                .from("conversations")
                .select("profile_pic")
                .eq("id", conversationId)
                .single();

            setActiveProfilePic(conv?.profile_pic ?? undefined);
        };
        fetchFreshKeys();
    }, [conversationId]);

    const handleEditSave = async () => {
        if (!editingId || !editValue.trim()) return;
        const currentId = editingId;
        const newVal = editValue;

        // Close UI
        setEditingId(null);
        setMenuOpenId(null);

        // Optimistic Update
        setMessages(prev => prev.map(m => m.id === currentId ? { ...m, text: newVal } : m));

        try {
            const res = await editMessage(currentId, newVal, conversationId);
            if (!res.success) {
                alert("Düzenleme başarısız: " + res.error);
                window.location.reload();
            }
        } catch (err: any) {
            console.error("Edit failed", err);
            alert("Beklenmedik hata: " + err.message);
        }
    };

    // Audio Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const wavRecorderRef = useRef<WavRecorder | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const startRecording = async () => {
        try {
            const recorder = new WavRecorder();
            await recorder.start();
            wavRecorderRef.current = recorder;

            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Microphone access denied:", err);
            alert("Mikrofon erişimi reddedildi veya bulunamadı.");
        }
    };

    const stopAndSendRecording = async () => {
        if (!wavRecorderRef.current) return;

        if (timerRef.current) clearInterval(timerRef.current);

        try {
            setIsRecording(false);
            setRecordingTime(0);
            setSending(true);

            const audioBlob = await wavRecorderRef.current.stop();
            const fileName = `voice_message_${Date.now()}.wav`;
            const audioFile = new File([audioBlob], fileName, { type: 'audio/wav' });

            const supabase = createClient();
            const storagePath = `${conversationId}/${fileName}`;

            const { error: uploadError } = await supabase
                .storage
                .from('chat-media')
                .upload(storagePath, audioFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase
                .storage
                .from('chat-media')
                .getPublicUrl(storagePath);

            const optimisticMsg: Message = {
                id: "temp-" + Date.now(),
                text: "",
                sender: "HUMAN",
                created_at: new Date().toISOString(),
                message_type: 'audio',
                media_url: publicUrl
            };
            setMessages((prev) => [...prev, optimisticMsg]);

            await sendMessage(conversationId, "", publicUrl, 'audio', fileName);

        } catch (err: any) {
            console.error("Audio upload/send failed:", err);
            alert("Ses gönderilemedi: " + err.message);
        } finally {
            setSending(false);
            wavRecorderRef.current = null;
        }
    };

    const cancelRecording = () => {
        if (!wavRecorderRef.current) return;
        wavRecorderRef.current.cancel();
        if (timerRef.current) clearInterval(timerRef.current);
        setIsRecording(false);
        setRecordingTime(0);
        wavRecorderRef.current = null;
    };

    // --- NEW HANDLERS ---
    const handleClearChat = async () => {
        if (!confirm("Bu sohbetin tüm mesajlarını silmek istediğinize emin misiniz?")) return;
        setMenuOpen(false);
        try {
            await clearConversationMessages(conversationId);
            setMessages([]); // Clear local state immediately for UI response
            alert("Sohbet temizlendi.");
        } catch (error: any) {
            alert("Hata: " + error.message);
        }
    };

    const handleDeleteChat = async () => {
        if (!confirm("Bu sohbeti tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) return;
        setMenuOpen(false);
        try {
            await deleteConversation(conversationId);
            router.push('/panel/inbox');
        } catch (error: any) {
            alert("Hata: " + error.message);
        }
    };

    // Smart Scroll
    useEffect(() => {
        const hasNewMessages = messages.length > prevMessageCountRef.current;
        prevMessageCountRef.current = messages.length;

        if (isAtBottomRef.current && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            setShowScrollButton(false);
        } else if (hasNewMessages) {
            setShowScrollButton(true);
        }
    }, [messages]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            isAtBottomRef.current = true;
        }
    }, []);

    // Realtime
    useEffect(() => {
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
                    markConversationAsRead(conversationId);
                    const newMsg = payload.new as Message;
                    setMessages((prev) => {
                        if (prev.some(m => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversationId]);

    // Polling Backup
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
                    if (data && data.length !== messages.length) {
                        // Only update if count mismatch to avoid stutter, simplistic sync
                        // Actually let's trust realtime mostly, this is fallback
                    }
                });
        }, 5000); // 5 sec is enough
        return () => clearInterval(interval);
    }, [conversationId, messages.length]);

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
        setShowEmojiPicker(false);

        try {
            await sendMessage(conversationId, optimisticMsg.text);
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
        <div className="flex flex-col h-full relative">

            {/* LIGHTBOX OVERLAY */}
            {lightboxMedia && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
                    onClick={() => setLightboxMedia(null)}
                >
                    <button
                        className="absolute top-4 right-4 text-white/50 hover:text-white p-2"
                        onClick={() => setLightboxMedia(null)}
                    >
                        <X size={32} />
                    </button>

                    <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        {lightboxMedia.type === 'image' ? (
                            <img
                                src={lightboxMedia.url}
                                className="max-w-full max-h-[85vh] object-contain rounded-md shadow-2xl"
                                alt="Full View"
                            />
                        ) : (
                            <video
                                src={lightboxMedia.url}
                                controls
                                autoPlay
                                className="max-w-full max-h-[85vh] rounded-md shadow-2xl"
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Header / Toolbar */}
            <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-white shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                        {activeProfilePic && (
                            <div className="absolute -inset-2 border-2 border-green-500/60 rounded-full animate-ping duration-[2000ms]" />
                        )}
                        <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-slate-50 border border-slate-200 relative z-10">
                            {platform === 'whatsapp' ? (
                                <MessageCircle className="text-green-500 w-5 h-5" />
                            ) : (
                                activeProfilePic ? (
                                    <img
                                        src={activeProfilePic}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                    />
                                ) : (
                                    <Instagram className="text-pink-500 w-5 h-5" />
                                )
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{customerName}</span>
                        {platform === 'instagram' && <Instagram className="w-5 h-5 text-pink-500" />}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className={clsx("w-3 h-3 rounded-full", conversationMode === "BOT" ? "bg-purple-500 shadow-purple-500/50 shadow-lg" : "bg-blue-500")}></div>
                        <span className="font-bold text-sm text-slate-600">
                            {conversationMode === "BOT" ? "AI Modu Aktif" : "Manuel Mod (Human)"}
                        </span>
                    </div>

                    <Button
                        variant={conversationMode === "BOT" ? "destructive" : "default"}
                        size="sm"
                        onClick={handleToggle}
                        disabled={!aiOperational}
                        className={clsx(
                            !aiOperational && "opacity-50 cursor-not-allowed",
                            conversationMode === "BOT" && "bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-500/20"
                        )}
                    >
                        {conversationMode === "BOT" ? <><User className="mr-2 w-4 h-4" />Devral (Human)</> : <><Bot className="mr-2 w-4 h-4" />AI'ya Devret</>}
                    </Button>

                    {/* NEW CRM MENU */}
                    <div className="relative z-50 ml-2">
                        <Button variant="ghost" size="icon" className="hover:bg-slate-100 text-slate-900 rounded-full h-9 w-9 border-2 border-slate-900 flex items-center justify-center transition-colors" onClick={() => setMenuOpen(!menuOpen)}>
                            <Menu className="w-5 h-5 stroke-[2.5]" />
                        </Button>

                        {menuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                                <div className="absolute right-0 top-10 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-50 py-2 animate-in fade-in zoom-in-95 duration-100 origin-top-right text-slate-900 dark:text-slate-100">
                                    <div
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-sm font-medium"
                                        onClick={() => { setContactSheetOpen(true); setMenuOpen(false); }}
                                    >
                                        <User className="w-4 h-4 text-slate-500" /> Kişi bilgisi
                                    </div>
                                    <div className="border-b border-slate-100 dark:border-slate-800 my-1" />
                                    <div
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-sm font-medium text-slate-600 dark:text-slate-400"
                                        onClick={handleClearChat}
                                    >
                                        <Eraser className="w-4 h-4" /> Sohbeti Temizle
                                    </div>
                                    <div
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
                                        onClick={handleDeleteChat}
                                    >
                                        <Trash2 className="w-4 h-4" /> Sohbeti Sil
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#efe7dd] relative scroll-smooth"
                ref={scrollRef}
                onScroll={handleScroll}
                style={{
                    backgroundImage: "linear-gradient(rgba(239, 231, 221, 0.9), rgba(239, 231, 221, 0.9)), url('/chat-final-bg.png')",
                    backgroundRepeat: 'repeat',
                    backgroundSize: '600px',
                }}
            >
                {messages.map((msg) => {
                    const isMe = msg.sender === "HUMAN";
                    const isBot = msg.sender === "BOT";
                    const isEditing = editingId === msg.id;
                    const canEdit = false;

                    return (
                        <div key={msg.id} className={clsx("flex flex-col max-w-[70%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                            {/* Sender Label */}
                            <span className="text-xs text-gray-600 mb-1 ml-1 font-medium">
                                {isMe ? "Siz" : isBot ? "AI Bot" : "Müşteri"}
                            </span>

                            {/* Bubble */}
                            <div className={clsx(
                                "rounded-lg text-sm relative group shadow-sm",
                                (msg.message_type === 'image' || msg.message_type === 'video')
                                    ? "p-1 bg-white overflow-hidden"
                                    : [
                                        "px-2 py-1.5 min-w-[120px]",
                                        isMe
                                            ? "bg-[#d9fdd3] text-gray-900 rounded-tr-none"
                                            : "bg-white text-gray-900 rounded-tl-none"
                                    ]
                            )}>
                                {msg.message_type === 'image' && msg.media_url ? (
                                    <div className="cursor-pointer" onClick={() => setLightboxMedia({ url: msg.media_url!, type: 'image' })}>
                                        <img
                                            src={msg.media_url}
                                            alt="Gelen Fotoğraf"
                                            className="max-w-[240px] rounded block hover:opacity-90 transition-opacity"
                                            onLoad={() => scrollRef.current!.scrollTop = scrollRef.current!.scrollHeight}
                                        />
                                    </div>
                                ) : msg.message_type === 'video' && msg.media_url ? (
                                    <div
                                        className="cursor-pointer max-w-[240px] relative"
                                        onClick={() => setLightboxMedia({ url: msg.media_url!, type: 'video' })}
                                    >
                                        <video
                                            src={msg.media_url}
                                            className="w-full rounded pointer-events-none block"
                                            onLoadedMetadata={() => scrollRef.current!.scrollTop = scrollRef.current!.scrollHeight}
                                            muted
                                            preload="metadata"
                                        />
                                    </div>
                                ) : msg.message_type === 'audio' && msg.media_url ? (
                                    <div className="mb-1 min-w-[200px] flex items-center">
                                        <audio src={msg.media_url} controls className="w-full h-8" />
                                    </div>
                                ) : null}

                                {msg.text && !['image', 'video', 'audio'].includes(msg.message_type || '') && (
                                    isEditing ? (
                                        <div className="flex flex-col gap-2 min-w-[200px]">
                                            <textarea
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value)}
                                                className="bg-white border border-gray-300 rounded p-2 text-gray-900 w-full text-sm resize-none focus:outline-none focus:ring-1 focus:ring-green-500"
                                                rows={3}
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => setEditingId(null)} className="p-1 hover:bg-gray-100 rounded text-gray-500">
                                                    <X size={14} />
                                                </button>
                                                <button onClick={handleEditSave} className="p-1 hover:bg-gray-100 rounded text-green-600">
                                                    <Check size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={clsx("whitespace-pre-wrap relative text-sm leading-relaxed", canEdit ? "pr-6" : "")}>
                                            {msg.text}
                                            <div className="float-right ml-2 mt-2 flex items-center gap-1">
                                                <span className="text-[10px] text-gray-500">
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {isMe && <Check size={12} className="text-blue-500" />}
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Scroll Down Button */}
            {showScrollButton && (
                <button
                    onClick={() => {
                        if (scrollRef.current) {
                            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
                            setShowScrollButton(false);
                            isAtBottomRef.current = true;
                        }
                    }}
                    className="absolute bottom-24 right-1/2 translate-x-1/2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full shadow-xl flex items-center gap-2 z-20 text-sm font-bold animate-in fade-in slide-in-from-bottom-4 border border-white/20"
                >
                    <ArrowDown className="w-4 h-4" />
                    Yeni Mesaj
                </button>
            )}

            {/* Input Area */}
            <div className="relative bg-white border-t border-slate-200 h-[72px]">
                {conversationMode === 'BOT' && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden">
                        <div
                            className="absolute inset-0 w-full h-full opacity-90"
                            style={{
                                background: "linear-gradient(90deg, #dc2626 0%, #ffffff 50%, #dc2626 100%)"
                            }}
                        />
                        <button
                            onClick={handleToggle}
                            disabled={!aiOperational}
                            className="relative z-10 px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-bold tracking-wide rounded-xl shadow-2xl border-2 border-white/20 flex items-center gap-3 transform transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                        >
                            <span className="animate-pulse">⚠️</span>
                            Şu an AI yanıtlıyor. Müdahale etmek için "Human" moduna geçin.
                            <div className="ml-2 bg-white/20 p-1 rounded-full">
                                <User className="w-4 h-4" />
                            </div>
                        </button>
                    </div>
                )}

                {showEmojiPicker && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                        <div className="absolute bottom-full left-0 z-50 mb-2 ml-4 shadow-2xl rounded-xl overflow-hidden border border-white/10">
                            <EmojiPicker
                                onEmojiClick={(emojiData) => {
                                    setInput(prev => prev + emojiData.emoji);
                                }}
                                theme={Theme.DARK}
                                width={300}
                                height={400}
                                lazyLoadEmojis={true}
                                emojiStyle={EmojiStyle.NATIVE}
                            />
                        </div>
                    </>
                )}

                <form onSubmit={handleSend} className="p-4 flex gap-2 items-center bg-white">
                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            if (file.size > 50 * 1024 * 1024) {
                                alert("Dosya boyutu 50MB'dan küçük olmalı");
                                return;
                            }

                            setSending(true);
                            try {
                                let msgType = 'document';
                                if (file.type.startsWith('image/')) msgType = 'image';
                                else if (file.type.startsWith('video/')) msgType = 'video';
                                else if (file.type.startsWith('audio/')) msgType = 'audio';

                                const supabase = createClient();
                                const ext = file.name.split('.').pop();
                                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
                                const filePath = `${conversationId}/${fileName}`;

                                const { error: uploadError } = await supabase
                                    .storage
                                    .from('chat-media')
                                    .upload(filePath, file);

                                if (uploadError) throw uploadError;

                                const { data: { publicUrl } } = supabase
                                    .storage
                                    .from('chat-media')
                                    .getPublicUrl(filePath);

                                const textToSend = input.trim() || file.name;

                                const optimisticMsg: Message = {
                                    id: "temp-" + Date.now(),
                                    text: textToSend,
                                    sender: "HUMAN",
                                    created_at: new Date().toISOString(),
                                    message_type: msgType,
                                    media_url: publicUrl
                                };
                                setMessages((prev) => [...prev, optimisticMsg]);

                                if (input.trim()) setInput("");

                                await sendMessage(conversationId, textToSend, publicUrl, msgType, file.name);

                            } catch (err: any) {
                                console.error("Upload failed", err);
                                alert("Yükleme hatası: " + err.message);
                            } finally {
                                setSending(false);
                                e.target.value = '';
                            }
                        }}
                    />

                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => document.getElementById('file-upload')?.click()}
                            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-full transition-all duration-200 hover:scale-110"
                            disabled={sending}
                        >
                            <Paperclip className="w-5 h-5" />
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className={clsx(
                                "p-2 rounded-full transition-all duration-200 hover:scale-110",
                                showEmojiPicker ? "text-yellow-500 bg-yellow-50" : "text-gray-500 hover:text-yellow-500 hover:bg-yellow-50"
                            )}
                        >
                            <Smile className="w-5 h-5" />
                        </button>
                    </div>

                    {isRecording ? (
                        <div className="flex-1 flex items-center justify-between bg-red-500/10 rounded-lg px-4 py-2 border border-red-500/20 animate-pulse">
                            <div className="flex items-center gap-2 text-red-500 font-mono font-medium">
                                <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
                                {formatTime(recordingTime)}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={cancelRecording}
                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors font-medium text-xs"
                                >
                                    İptal
                                </button>
                                <button
                                    type="button"
                                    onClick={stopAndSendRecording}
                                    className="p-2 bg-primary hover:bg-primary/90 text-white rounded-full transition-colors shadow-lg shadow-primary/20"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={platform === 'instagram' ? "Mesaj yazın (Belge gönderilemez)..." : "Mesaj yazın..."}
                                className="flex-1 bg-[#f0f2f5] border-gray-200 text-gray-900 placeholder:text-gray-500"
                            />
                            {!input.trim() && (
                                <button
                                    type="button"
                                    onClick={startRecording}
                                    className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200 hover:scale-110"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
                                </button>
                            )}
                            {input.trim() && (
                                <Button type="submit" disabled={sending || conversationMode === 'BOT'}>
                                    <Send className="w-4 h-4" />
                                </Button>
                            )}
                        </>
                    )}
                </form>
            </div>
            <ContactInfoSheet
                isOpen={contactSheetOpen}
                onClose={() => setContactSheetOpen(false)}
                conversationId={conversationId}
                customerHandle={customerName}
                platform={platform}
                initialProfilePic={activeProfilePic}
                onClearChat={handleClearChat}
                onDeleteChat={handleDeleteChat}
            />
        </div>
    );
}
