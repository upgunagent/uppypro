"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendMessage, toggleMode, editMessage, markConversationAsRead, deleteConversation, clearConversationMessages } from "@/app/actions/chat";
import { ContactInfoSheet } from "@/components/crm/contact-info-sheet";
import { Send, Bot, User, Smile, Paperclip, MoreVertical, Edit2, X, Check, MessageCircle, Instagram, ArrowDown, Trash2, Ban, Eraser, Menu, Search, FileText, Download, MapPin } from "lucide-react";
import { clsx } from "clsx";
import { WavRecorder } from "@/lib/audio/wav-recorder";
import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react';
import { useMemo } from "react";

interface Message {
    id: string;
    text: string;
    sender: "CUSTOMER" | "BOT" | "HUMAN";
    created_at: string;
    message_type?: string;
    media_url?: string;
    payload?: any;
}

interface ChatInterfaceProps {
    conversationId: string;
    initialMessages: Message[];
    conversationMode: "BOT" | "HUMAN";
    aiOperational: boolean;
    platform: string;
    customerName: string;
    profilePic?: string;
    tenantLocations?: any[];
    tenantId: string;
}

export default function ChatInterface({
    conversationId,
    initialMessages,
    conversationMode,
    aiOperational,
    platform,
    customerName,
    profilePic,
    tenantLocations: initialLocations,
    tenantId
}: ChatInterfaceProps) {
    const router = useRouter();
    // Default array fallback for safety
    const safeLocations = initialLocations || [];
    console.log("ChatInterface received tenantLocations:", initialLocations);
    console.log("SafeLocations applied:", safeLocations);

    const [messages, setMessages] = useState(initialMessages);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [lightboxMedia, setLightboxMedia] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const [tenantLocations, setTenantLocations] = useState<any[]>(safeLocations);

    // Message Search State
    const [messageSearchQuery, setMessageSearchQuery] = useState("");

    const filteredMessages = useMemo(() => {
        if (!messageSearchQuery.trim()) return messages;
        const lowerQ = messageSearchQuery.toLowerCase();
        return messages.filter(m => (m.text || '').toLowerCase().includes(lowerQ));
    }, [messages, messageSearchQuery]);

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

    // tenantLocations Props Sync (Client-Side Fetch to bypass stale SSR cache)
    useEffect(() => {
        const fetchLocations = async () => {
            const { getTenantLocations } = await import('@/app/actions/locations');
            try {
                const data = await getTenantLocations(tenantId);
                if (data) {
                    setTenantLocations(data);
                }
            } catch (error) {
                console.error("Failed to fetch tenant locations:", error);
            }
        };

        if (showLocationPicker) {
            fetchLocations();
        }
    }, [showLocationPicker, tenantId]);

    // 2. Conversation Init
    useEffect(() => {
        setActiveProfilePic(profilePic);
        markConversationAsRead(conversationId);
    }, [conversationId, profilePic]);

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



    // HYBRID SYNC: Realtime + Polling Backup
    useEffect(() => {
        if (!conversationId) return;

        const syncMessages = async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            if (data) {
                setMessages(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    // Filter out messages we already have strictly
                    const newOnes = data.filter(m => !existingIds.has(m.id));

                    if (newOnes.length === 0) return prev;

                    // Merge strategy with Optimistic Dedupe
                    let newList = [...prev];

                    newOnes.forEach(realMsg => {
                        // Try to find a temp match for this real message
                        if (realMsg.sender === 'HUMAN') {
                            const matchIdx = newList.findIndex(m =>
                                m.id.startsWith('temp-') &&
                                m.text === realMsg.text
                            );
                            if (matchIdx !== -1) {
                                newList[matchIdx] = realMsg; // Replace
                            } else {
                                newList.push(realMsg); // Append
                            }
                        } else {
                            newList.push(realMsg); // Apppend (Bot/Customer)
                        }
                    });

                    // Re-sort just in case replacment messed up order
                    newList.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

                    return newList;
                });

                // Read marker
                markConversationAsRead(conversationId);
            }
        };

        // 1. Initial Fetch
        syncMessages();

        // 2. Realtime Subscription
        const supabase = createClient();
        const channel = supabase
            .channel(`chat:${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}` // More efficient server-side filtering
                },
                (payload) => {
                    const newMsg = payload.new as Message;
                    // Trigger sync or direct append
                    // Direct append is faster for UI
                    setMessages((prev) => {
                        if (prev.some(m => m.id === newMsg.id)) return prev;
                        const newList = [...prev, newMsg];
                        // Sort ensures order
                        newList.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                        return newList;
                    });
                    markConversationAsRead(conversationId);
                }
            )
            .subscribe();

        // 3. Polling Fallback (Every 4s) - Lightweight
        // This ensures that even if Realtime drops, we get messages eventually.
        // It does NOT block navigation like the global list polling did.
        const interval = setInterval(syncMessages, 4000);

        return () => {
            clearInterval(interval);
            supabase.removeChannel(channel);
        };
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
            const { data: realMsg } = await sendMessage(conversationId, optimisticMsg.text);

            if (realMsg) {
                setMessages(prev => {
                    // Check if the real message already arrived via realtime or hybrid sync
                    const alreadyExists = prev.some(m => m.id === realMsg.id);

                    if (alreadyExists) {
                        // If real message exists, remove the temp one to dedup
                        return prev.filter(m => m.id !== optimisticMsg.id);
                    } else {
                        // Otherwise, swap temp -> real
                        return prev.map(m => m.id === optimisticMsg.id ? (realMsg as Message) : m);
                    }
                });
            }
        } catch (err) {
            console.error("Failed to send", err);
            // Optional: Mark optimistic msg as error
        } finally {
            setSending(false);
        }
    };

    // Local Mode State to Support Optimistic Updates
    const [currentMode, setCurrentMode] = useState(conversationMode);

    useEffect(() => {
        setCurrentMode(conversationMode);
    }, [conversationMode]);

    const handleToggle = async () => {
        const previousMode = currentMode; // Store the mode before optimistic update
        const newMode = previousMode === 'BOT' ? 'HUMAN' : 'BOT';

        // Optimistic Update
        setCurrentMode(newMode);

        try {
            await toggleMode(conversationId, newMode); // Pass the target mode to the backend
        } catch (err) {
            console.error("Toggle failed", err);
            // Rollback on error
            setCurrentMode(previousMode); // Revert to the previous mode
            alert("Mod değişimi başarısız oldu.");
        }
    };

    const handleDownloadMedia = async (url: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;

            let ext = url.split('.').pop()?.split('?')[0] || 'media';
            if (ext.length > 5) ext = 'media';

            link.download = `media-${Date.now()}.${ext}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed:', error);
            window.open(url, '_blank');
        }
    };

    // Focus State for Mobile Keyboard Handling
    const [isInputFocused, setIsInputFocused] = useState(false);

    return (
        <div className="flex flex-col h-full relative">

            {/* LIGHTBOX OVERLAY */}
            {lightboxMedia && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
                    onClick={() => setLightboxMedia(null)}
                >
                    <div className="absolute top-4 right-4 flex items-center gap-3">
                        <button
                            className="bg-black/50 text-white/80 hover:text-white p-2.5 rounded-full hover:bg-black/70 backdrop-blur-sm transition-all"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadMedia(lightboxMedia.url);
                            }}
                            title="İndir"
                        >
                            <Download size={22} />
                        </button>
                        <button
                            className="bg-black/50 text-white/80 hover:text-white p-2.5 rounded-full hover:bg-black/70 backdrop-blur-sm transition-all"
                            onClick={(e) => {
                                e.stopPropagation();
                                setLightboxMedia(null);
                            }}
                            title="Kapat"
                        >
                            <X size={22} />
                        </button>
                    </div>

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

                <div className="flex items-center gap-1.5 md:gap-3">
                    {/* Message Search Filter */}
                    <div className="relative w-48 hidden md:block">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Mesajlarda ara..."
                            value={messageSearchQuery}
                            onChange={(e) => setMessageSearchQuery(e.target.value)}
                            className="w-full h-8 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-2 hidden sm:flex">
                        <div className={clsx("w-3 h-3 rounded-full", currentMode === "BOT" ? "bg-green-500 shadow-green-500/50 shadow-lg" : "bg-red-500")}></div>
                        <span className="font-bold text-sm text-slate-600">
                            {currentMode === "BOT" ? "AI Modu Aktif" : "Manuel Mod (Human)"}
                        </span>
                    </div>

                    {/* DEBUG INDICATOR */}


                    <Button
                        variant="default"
                        size="sm"
                        onClick={handleToggle}
                        disabled={!aiOperational}
                        className={clsx(
                            "h-9 px-3 text-xs md:text-sm whitespace-nowrap",
                            !aiOperational && "opacity-50 cursor-not-allowed",
                            currentMode === "BOT"
                                ? "bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-500/20"
                                : "bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-500/20"
                        )}
                    >
                        {currentMode === "BOT" ? <><User className="mr-1.5 w-3.5 h-3.5" />Devral</> : <><Bot className="mr-1.5 w-3.5 h-3.5" />AI'ya Devret</>}
                    </Button>

                    {/* NEW CRM MENU */}
                    <div className="relative z-50 ml-1 md:ml-2">
                        <Button variant="ghost" size="icon" className="hover:bg-slate-100 text-slate-900 rounded-full h-9 w-9 border md:border-2 border-slate-900 flex items-center justify-center transition-colors" onClick={() => setMenuOpen(!menuOpen)}>
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
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#efe7dd] relative scroll-smooth pb-[140px] md:pb-4"
                ref={scrollRef}
                onScroll={handleScroll}
                style={{
                    backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)), url('/chatbox_bg_uu.png')",
                    backgroundRepeat: 'repeat',
                    backgroundSize: '600px',
                }}
            >
                {filteredMessages.map((msg, index) => {
                    const isMe = msg.sender === "HUMAN";
                    const isBot = msg.sender === "BOT";
                    const isEditing = editingId === msg.id;
                    const canEdit = false;

                    const msgDate = new Date(msg.created_at);
                    const msgDateString = msgDate.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'long' });

                    let showDateSeparator = false;
                    if (index === 0) {
                        showDateSeparator = true;
                    } else {
                        const prevMsgDate = new Date(filteredMessages[index - 1].created_at);
                        const prevMsgDateString = prevMsgDate.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'long' });
                        if (msgDateString !== prevMsgDateString) {
                            showDateSeparator = true;
                        }
                    }

                    return (
                        <div key={msg.id} className="w-full flex flex-col">
                            {showDateSeparator && (
                                <div className="flex justify-center my-4 w-full">
                                    <div className="bg-white/90 backdrop-blur-sm px-4 py-1.5 rounded-lg shadow-sm text-xs font-bold text-slate-700 border border-slate-200">
                                        {msgDateString}
                                    </div>
                                </div>
                            )}
                            <div className={clsx("flex flex-col max-w-[70%]", (isMe || isBot) ? "ml-auto items-end" : "mr-auto items-start")}>
                                {/* Sender Label */}
                                <span className="text-xs text-gray-600 mb-1 ml-1 font-medium">
                                    {isMe ? "Siz" : isBot ? "Dijital Asistan" : customerName}
                                </span>

                                {/* Bubble */}
                                <div className={clsx(
                                    "rounded-lg text-sm relative group shadow-sm",
                                    (msg.message_type === 'image' || msg.message_type === 'video')
                                        ? "p-1 bg-white overflow-hidden"
                                        : [
                                            "px-2 py-1.5 min-w-[120px]",
                                            isBot
                                                ? "bg-yellow-50 text-gray-900 rounded-tr-none"
                                                : isMe
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
                                    ) : msg.message_type === 'document' && msg.media_url ? (
                                        <a
                                            href={msg.media_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 p-3 bg-white/50 border border-slate-200 rounded-lg hover:bg-white/80 transition-colors cursor-pointer w-[240px]"
                                        >
                                            <div className="bg-red-100 p-2 rounded-lg text-red-600 shrink-0">
                                                <FileText size={20} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-700 truncate" title={
                                                    (() => {
                                                        if (msg.text && msg.text.trim() && msg.text !== '[Document]' && msg.text !== '[Belge]' && !msg.text.startsWith('http')) return msg.text;
                                                        try {
                                                            const url = new URL(msg.media_url!);
                                                            const parts = url.pathname.split('/');
                                                            return decodeURIComponent(parts[parts.length - 1] || 'Belge');
                                                        } catch (e) { return 'Belge'; }
                                                    })()
                                                }>
                                                    {(() => {
                                                        if (msg.text && msg.text.trim() && msg.text !== '[Document]' && msg.text !== '[Belge]' && !msg.text.startsWith('http')) return msg.text;
                                                        try {
                                                            const url = new URL(msg.media_url!);
                                                            const parts = url.pathname.split('/');
                                                            return decodeURIComponent(parts[parts.length - 1] || 'Belge');
                                                        } catch (e) { return 'Belge'; }
                                                    })()}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    Aç veya İndir
                                                </p>
                                            </div>
                                            <Download size={16} className="text-slate-400 shrink-0" />
                                        </a>
                                    ) : msg.message_type === 'location' && msg.payload ? (
                                        <a
                                            href={msg.payload.url || `https://www.google.com/maps/search/?api=1&query=${msg.payload.latitude},${msg.payload.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors cursor-pointer min-w-[200px]"
                                        >
                                            <div className="bg-red-200 p-2 rounded-lg text-red-700 shrink-0">
                                                <MapPin size={20} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-red-900 truncate">
                                                    {msg.payload.name || "Konum Paylaşıldı"}
                                                </p>
                                                {msg.payload.address && (
                                                    <p className="text-xs text-red-800 line-clamp-2 mt-0.5 leading-tight">
                                                        {msg.payload.address}
                                                    </p>
                                                )}
                                                <p className="text-[11px] font-semibold text-red-600 mt-1 uppercase tracking-wide">
                                                    Haritada Gör
                                                </p>
                                            </div>
                                        </a>
                                    ) : null}

                                    {msg.text && !['image', 'video', 'audio', 'document', 'location'].includes(msg.message_type || '') && (
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
                        </div>
                    );
                })}
                {filteredMessages.length === 0 && !messageSearchQuery && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-2 opacity-60">
                        <span className="text-4xl">💭</span>
                        <p>Bu sohbette henüz mesaj yok.</p>
                    </div>
                )}
                {filteredMessages.length === 0 && messageSearchQuery && (
                    <div className="text-center text-gray-400 text-sm mt-10">
                        Aranan kriterde mesaj bulunamadı.
                    </div>
                )}
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
            <div
                className={clsx(
                    "fixed md:relative left-0 right-0 bg-white border-t border-slate-200 z-40 transition-all duration-100",
                    // Mobile Strategy: Always stick to bottom (covering scrolling content).
                    // When blur: Add padding (58px) to push input slightly behind the 60px Nav (2px overlap).
                    // When focus: Remove padding to sit on keyboard.
                    isInputFocused ? "bottom-0 pb-0" : "bottom-0 pb-[58px] md:pb-0 md:bottom-auto"
                )}
            >
                {currentMode === 'BOT' && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 w-full h-full bg-red-600/75" />
                        <button
                            onClick={handleToggle}
                            disabled={!aiOperational}
                            className="relative z-10 px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-bold tracking-wide rounded-xl shadow-2xl border-2 border-white/20 flex items-center gap-3 transform transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                        >
                            <span className="animate-pulse">⚠️</span>
                            Dijital Asistanınız yanıtlıyor. Müdehale etmek için "Human" moduna geçin.
                            <div className="ml-2 bg-white/20 p-1 rounded-full">
                                <User className="w-4 h-4" />
                            </div>
                        </button>
                    </div>
                )}

                {showEmojiPicker && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                        <div className="absolute bottom-full left-0 z-50 mb-2 ml-4 shadow-2xl rounded-xl overflow-hidden border border-slate-200">
                            <EmojiPicker
                                onEmojiClick={(emojiData) => {
                                    setInput(prev => prev + emojiData.emoji);
                                }}
                                theme={Theme.LIGHT}
                                width={300}
                                height={400}
                                lazyLoadEmojis={true}
                                emojiStyle={EmojiStyle.NATIVE}
                            />
                        </div>
                    </>
                )}

                {showLocationPicker && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowLocationPicker(false)} />
                        <div className="absolute bottom-full left-10 z-50 mb-2 shadow-2xl rounded-xl overflow-hidden border border-slate-200 bg-white w-64 max-h-64 overflow-y-auto">
                            <div className="p-3 bg-red-50 border-b border-red-100 flex items-center gap-2">
                                <MapPin className="text-red-500" size={16} />
                                <span className="font-semibold text-slate-700 text-sm">Kayıtlı Konumlar</span>
                            </div>
                            {tenantLocations?.length === 0 ? (
                                <div className="p-4 text-center text-xs text-slate-500">Kayıtlı konum bulunamadı. İşletme Ayarları'ndan ekleyebilirsiniz.</div>
                            ) : (
                                <div className="flex flex-col">
                                    {tenantLocations?.map((loc) => (
                                        <button
                                            key={loc.id}
                                            type="button"
                                            className="text-left p-3 hover:bg-slate-50 transition-colors border-b last:border-0 border-slate-100 flex flex-col gap-1 cursor-pointer"
                                            onClick={async () => {
                                                setShowLocationPicker(false);
                                                setSending(true);
                                                try {
                                                    const textToSend = loc.title;
                                                    const payloadToSend = {
                                                        latitude: loc.latitude,
                                                        longitude: loc.longitude,
                                                        name: loc.title,
                                                        address: loc.address,
                                                        url: loc.url
                                                    };

                                                    const optimisticMsg: Message = {
                                                        id: "temp-" + Date.now(),
                                                        text: textToSend,
                                                        sender: "HUMAN",
                                                        created_at: new Date().toISOString(),
                                                        message_type: 'location',
                                                        payload: payloadToSend
                                                    };
                                                    setMessages((prev) => [...prev, optimisticMsg]);

                                                    await sendMessage(conversationId, textToSend, undefined, 'location', undefined, payloadToSend);
                                                } catch (err: any) {
                                                    console.error("Location Send Failed:", err);
                                                    alert("Konum gönderilirken hata oluştu: " + err.message);
                                                } finally {
                                                    setSending(false);
                                                }
                                            }}
                                        >
                                            <span className="font-semibold text-slate-800 text-sm">{loc.title}</span>
                                            <span className="text-xs text-slate-500 line-clamp-1">{loc.address}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                <form onSubmit={handleSend} className="p-2 md:p-4 flex gap-2 items-center bg-white">
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
                            className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-all duration-200 hover:scale-110"
                            disabled={sending}
                        >
                            <Paperclip className="w-5 h-5" />
                        </button>

                        <button
                            type="button"
                            onClick={() => { setShowEmojiPicker(false); setShowLocationPicker(!showLocationPicker); }}
                            className="p-2 pr-1 text-red-500 hover:bg-red-50 rounded-full transition-all duration-200 hover:scale-110"
                            disabled={sending}
                            title="Konum Gönder"
                        >
                            <MapPin className="w-5 h-5" />
                        </button>

                        <button
                            type="button"
                            onClick={() => { setShowLocationPicker(false); setShowEmojiPicker(!showEmojiPicker); }}
                            className="p-2 rounded-full transition-all duration-200 hover:scale-110 hover:bg-yellow-50"
                        >
                            <span className="text-xl leading-none">🙂</span>
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
                                onFocus={() => setIsInputFocused(true)}
                                onBlur={() => setIsInputFocused(false)}
                                placeholder={platform === 'instagram' ? "Mesaj yazın (Belge gönderilemez)..." : "Mesaj yazın..."}
                                className="flex-1 bg-[#f0f2f5] border-gray-200 text-gray-900 placeholder:text-gray-500 focus-visible:ring-orange-500 text-base md:text-sm"
                            />
                            {!input.trim() && (
                                <button
                                    type="button"
                                    onClick={startRecording}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-all duration-200 hover:scale-110"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
                                </button>
                            )}
                            {input.trim() && (
                                <Button type="submit" disabled={sending || currentMode === 'BOT'} className="bg-orange-600 hover:bg-orange-700">
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
        </div >
    );
}
