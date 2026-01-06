"use client";


import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendMessage, toggleMode } from "@/app/actions/chat";
import { Send, Bot, User, Smile, Paperclip } from "lucide-react";
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
}

export default function ChatInterface({ conversationId, initialMessages, conversationMode, aiOperational, platform }: ChatInterfaceProps) {
    const [messages, setMessages] = useState(initialMessages);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [lightboxMedia, setLightboxMedia] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

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
        <div className="flex flex-col h-[calc(100vh-8rem)] relative">
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
                                "rounded-2xl text-sm overflow-hidden relative group",
                                (msg.message_type === 'image' || msg.message_type === 'video')
                                    ? "p-0 bg-transparent" // Media: No padding, transparent
                                    : [
                                        "px-4 py-2", // Text/Doc/Audio: Standard padding
                                        isMe
                                            ? "bg-primary text-white rounded-br-none"
                                            : isBot
                                                ? "bg-purple-600/20 border border-purple-500/30 text-purple-100 rounded-bl-none"
                                                : "bg-white/10 text-gray-200 rounded-bl-none"
                                    ]
                            )}>
                                {/* MEDIA CONTENT */}
                                {msg.message_type === 'image' && msg.media_url ? (
                                    <div className="cursor-pointer" onClick={() => setLightboxMedia({ url: msg.media_url!, type: 'image' })}>
                                        <img
                                            src={msg.media_url}
                                            alt="Gelen Fotoğraf"
                                            className="max-w-[240px] rounded-2xl block hover:opacity-90 transition-opacity"
                                            onLoad={() => scrollRef.current!.scrollTop = scrollRef.current!.scrollHeight}
                                        />
                                        {/* Timestamp Overlay for Image */}
                                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/40 backdrop-blur-sm rounded text-[10px] text-white/90 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                ) : msg.message_type === 'video' && msg.media_url ? (
                                    <div
                                        className="cursor-pointer max-w-[240px] relative"
                                        onClick={() => setLightboxMedia({ url: msg.media_url!, type: 'video' })}
                                    >
                                        <video
                                            src={msg.media_url}
                                            className="w-full rounded-2xl pointer-events-none block"
                                            onLoadedMetadata={() => scrollRef.current!.scrollTop = scrollRef.current!.scrollHeight}
                                            muted
                                            preload="metadata"
                                        />
                                        <div className="absolute inset-0 bg-black/10 flex items-center justify-center hover:bg-black/20 transition-colors rounded-2xl">
                                            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center border border-white/50">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                            </div>
                                        </div>
                                        {/* Timestamp Overlay for Video */}
                                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/40 backdrop-blur-sm rounded text-[10px] text-white/90 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
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

                                {/* TEXT CONTENT - Hide if media type is image/video/audio */}
                                {msg.text && !['image', 'video', 'audio'].includes(msg.message_type || '') && (
                                    <div className="whitespace-pre-wrap">{msg.text}</div>
                                )}
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
            <div className="relative">
                {/* Emoji Picker Popover */}
                {showEmojiPicker && (
                    <>
                        {/* Backdrop to close on click outside */}
                        <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />

                        <div className="absolute bottom-full left-0 z-50 mb-2 ml-4 shadow-2xl rounded-xl overflow-hidden border border-white/10">


                            <EmojiPicker
                                onEmojiClick={(emojiData) => {
                                    setInput(prev => prev + emojiData.emoji);
                                    // Keep picker open or close? Typically toggled manually.
                                    // setShowEmojiPicker(false); 
                                }}
                                theme={Theme.DARK} // Matches dark mode
                                width={300}
                                height={400}
                                lazyLoadEmojis={true}
                                emojiStyle={EmojiStyle.NATIVE} // Native IOS/Android emojis look better
                            />
                        </div>
                    </>
                )}

                <form onSubmit={handleSend} className="p-4 bg-white/5 border-t border-white/10 rounded-b-xl flex gap-2 items-center">
                    {/* File Upload Button (Previous Logic) */}
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
                                // Use file name as text/caption if inputs is empty
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

                                // If we used the input as text, clear it
                                if (input.trim()) setInput("");

                                await sendMessage(conversationId, textToSend, publicUrl, msgType, file.name);

                            } catch (err: any) {
                                console.error("Upload failed", err);
                                alert("Yükleme hatası: " + err.message);
                            } finally {
                                setSending(false);
                                // Reset input
                                e.target.value = '';
                            }
                        }}
                    />

                    {/* Action Buttons Container */}
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

                    {/* RECORDING UI */}
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
                                className="flex-1 bg-black/20 border-white/10"
                            />
                            {/* MIC BUTTON (Only show if input is empty) */}
                            {!input.trim() && (
                                <button
                                    type="button"
                                    onClick={startRecording}
                                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
                                </button>
                            )}
                            {/* Send Button (Only show if input has text) */}
                            {input.trim() && (
                                <Button type="submit" disabled={sending || conversationMode === 'BOT'}>
                                    <Send className="w-4 h-4" />
                                </Button>
                            )}
                        </>
                    )}
                </form>
            </div>
            {conversationMode === 'BOT' && (
                <div className="text-center text-xs text-purple-400 mt-2">
                    ⚠️ Şu an AI yanıtlıyor. Müdahale etmek için "Human" moduna geçin.
                </div>
            )}
        </div>
    );
}
