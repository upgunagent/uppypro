"use client";


import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendMessage, toggleMode, editMessage, markConversationAsRead } from "@/app/actions/chat";
import { Send, Bot, User, Smile, Paperclip, MoreVertical, Edit2, X, Check, MessageCircle, Instagram, ArrowDown } from "lucide-react";
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

    const handleScroll = () => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        // User is at bottom if they are within 100px of the end
        const isBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 100;
        isAtBottomRef.current = isBottom;

        if (isBottom) {
            setShowScrollButton(false);
        }
    };

    // Sync state with server-side props (Important for replacing optimistic IDs with real IDs)
    // Sync state with server-side props AND fetch fresh to ensure external_message_id presence
    useEffect(() => {
        // optimistically set from props first
        setMessages(initialMessages);
        setActiveProfilePic(profilePic);

        // Mark as READ
        markConversationAsRead(conversationId);

        // Then fetch fresh to ensure we have latest fields (like external_message_id) AND profile_pic (fallback)
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

            // 2. Profile Pic (Force Client Fetch)
            const { data: conv } = await supabase
                .from("conversations")
                .select("profile_pic")
                .eq("id", conversationId)
                .single();

            // Always update to current truth, preventing stale images from previous chats
            setActiveProfilePic(conv?.profile_pic ?? undefined);
        };
        fetchFreshKeys();
    }, [initialMessages, conversationId, profilePic]);

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
                // Revert optimistic update if needed?
                // For now just alert
                alert("Düzenleme başarısız: " + res.error);
                // Force refresh
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

    // Format seconds to MM:SS
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const startRecording = async () => {
        try {
            // Instantiate and start WAV recorder
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

        // Stop timer
        if (timerRef.current) clearInterval(timerRef.current);

        try {
            setIsRecording(false);
            setRecordingTime(0);
            setSending(true);

            // Stop recording and get WAV blob
            const audioBlob = await wavRecorderRef.current.stop();
            const fileName = `voice_message_${Date.now()}.wav`;
            const audioFile = new File([audioBlob], fileName, { type: 'audio/wav' });

            // Upload Logic
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

            // Send
            // Optimistic Update
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

    // Smart Scroll: Auto-scroll only if already at bottom
    useEffect(() => {
        if (isAtBottomRef.current && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        } else {
            setShowScrollButton(true);
        }
    }, [messages]);

    // Initial Load Scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            isAtBottomRef.current = true;
        }
    }, []);

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
                    // Mark read immediately if we are here
                    markConversationAsRead(conversationId);

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
        setShowEmojiPicker(false);

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
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
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
            <div className="flex justify-between items-center p-4 border-b border-white/10 bg-white/5 bg-slate-900">
                <div className="flex items-center gap-3">
                    {/* AVATAR + SIGNAL */}
                    <div className="relative shrink-0">
                        {/* Signal Animation: Thin Ripples */}
                        {activeProfilePic && (
                            <div className="absolute -inset-2 border-2 border-green-500/60 rounded-full animate-ping duration-[2000ms]" />
                        )}
                        <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-white/5 border border-white/10 relative z-10">
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
                        <span className="font-bold text-sm text-gray-400">
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
                                {/* MEDIA CONTENT */}
                                {msg.message_type === 'image' && msg.media_url ? (
                                    <div className="cursor-pointer" onClick={() => setLightboxMedia({ url: msg.media_url!, type: 'image' })}>
                                        <img
                                            src={msg.media_url}
                                            alt="Gelen Fotoğraf"
                                            className="max-w-[240px] rounded block hover:opacity-90 transition-opacity"
                                            onLoad={() => scrollRef.current!.scrollTop = scrollRef.current!.scrollHeight}
                                        />
                                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/40 backdrop-blur-sm rounded text-[10px] text-white/90 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {formatTime(new Date(msg.created_at).getTime() / 1000).replace(':', '')}
                                        </div>
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
                                        <div className="absolute inset-0 bg-black/10 flex items-center justify-center hover:bg-black/20 transition-colors rounded">
                                            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center border border-white/50">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                ) : msg.message_type === 'audio' && msg.media_url ? (
                                    <div className="mb-1 min-w-[200px] flex items-center">
                                        {/* Custom audio player could go here, for now standard */}
                                        <audio
                                            src={msg.media_url}
                                            controls
                                            className="w-full h-8"
                                        />
                                    </div>
                                ) : null}

                                {/* TEXT CONTENT */}
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
                                            {/* Time in Bubble (Right Bottom) */}
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
            <div className="relative bg-slate-900 border-t border-white/10 h-[72px]">
                {conversationMode === 'BOT' && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden">
                        {/* Hazard Stripes Background */}
                        <div
                            className="absolute inset-0 w-full h-full"
                            style={{
                                backgroundImage: "repeating-linear-gradient(45deg, #fbbf24 0, #fbbf24 20px, #1a1a1a 20px, #1a1a1a 40px)",
                                boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)"
                            }}
                        />
                        {/* Text Badge */}
                        <div className="relative z-10 px-6 py-2 bg-black/95 text-yellow-500 font-bold text-sm uppercase tracking-wider rounded-md border-2 border-yellow-500 shadow-2xl flex items-center gap-3">
                            ⚠️ Şu an AI yanıtlıyor. Müdahale etmek için "Human" moduna geçin.
                        </div>
                    </div>
                )}

                {/* Emoji Picker Popover */}
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

                <form onSubmit={handleSend} className="p-4 flex gap-2 items-center bg-slate-900">
                    {/* File Upload Button */}
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
                                // 1. Determine Type
                                let msgType = 'document';
                                if (file.type.startsWith('image/')) msgType = 'image';
                                else if (file.type.startsWith('video/')) msgType = 'video';
                                else if (file.type.startsWith('audio/')) msgType = 'audio';

                                // 2. Upload to Supabase Storage
                                const supabase = createClient();
                                const ext = file.name.split('.').pop();
                                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
                                const filePath = `${conversationId}/${fileName}`;

                                const { data: uploadData, error: uploadError } = await supabase
                                    .storage
                                    .from('chat-media') // Ensure this bucket exists!
                                    .upload(filePath, file);

                                if (uploadError) throw uploadError;

                                // 3. Get Public URL
                                const { data: { publicUrl } } = supabase
                                    .storage
                                    .from('chat-media')
                                    .getPublicUrl(filePath);

                                // 4. Send Message via Server Action
                                const textToSend = input.trim() || file.name;

                                // Optimistic Update
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
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                            disabled={sending}
                        >
                            <Paperclip className="w-5 h-5" />
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className={clsx(
                                "p-2 rounded-full transition-colors",
                                showEmojiPicker ? "text-yellow-400 bg-white/10" : "text-gray-400 hover:text-white hover:bg-white/10"
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
                                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors font-medium text-xs"
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
                                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
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
        </div>
    );
}
