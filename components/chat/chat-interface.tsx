"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendMessage, toggleMode, editMessage, markConversationAsRead, deleteConversation, clearConversationMessages } from "@/app/actions/chat";
import { ContactInfoSheet } from "@/components/crm/contact-info-sheet";
import { Send, Bot, User, Smile, Sparkles, Paperclip, MoreVertical, Edit2, X, Check, CheckCheck, MessageCircle, Instagram, ArrowDown, Trash2, Ban, Eraser, Menu, Search, FileText, Download, MapPin, Link as LinkIcon, Phone, MousePointerClick, MessageSquarePlus, MessageSquare } from "lucide-react";
import { clsx } from "clsx";
import { WavRecorder } from "@/lib/audio/wav-recorder";
import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react';
import { useMemo } from "react";
import { TemplatePickerModal } from "./template-picker-modal";
import { CannedResponsesPicker, CannedResponse } from "./canned-responses-picker";
import { AiCorrectButton } from "./ai-correct-button";
import TextareaAutosize from 'react-textarea-autosize';
import { TranslateButton } from "./translate-button";
import Image from "next/image";
import { toast } from "sonner";

interface Message {
    id: string;
    text: string;
    sender: "CUSTOMER" | "BOT" | "HUMAN";
    created_at: string;
    message_type?: string;
    media_url?: string;
    payload?: any;
    status?: string;
    is_read?: boolean;
    reactions?: { emoji: string; sender_id: string } | null;
    external_message_id?: string;
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
    const [showTemplatePicker, setShowTemplatePicker] = useState(false);
    const [showCannedPicker, setShowCannedPicker] = useState(false);
    const [selectedCannedMedia, setSelectedCannedMedia] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>("");
    const scrollRef = useRef<HTMLDivElement>(null);

    const [tenantLocations, setTenantLocations] = useState<any[]>(safeLocations);

    // Message Search State
    const [messageSearchQuery, setMessageSearchQuery] = useState("");

    // Translation State
    const [translations, setTranslations] = useState<Record<string, { text: string, detectedLanguage?: string }>>({});
    const [translatingMessageId, setTranslatingMessageId] = useState<string | null>(null);

    const lastDetectedLanguage = useMemo(() => {
        // Find the most recent detected language from translations
        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];
            const trans = translations[msg.id];
            if (trans && trans.detectedLanguage) {
                return trans.detectedLanguage;
            }
        }
        return null;
    }, [translations, messages]);

    const filteredMessages = useMemo(() => {
        if (!messageSearchQuery.trim()) return messages;
        const lowerQ = messageSearchQuery.toLowerCase();
        return messages.filter(m => (m.text || '').toLowerCase().includes(lowerQ));
    }, [messages, messageSearchQuery]);

    // Edit State
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


    const handleEditSave = async (msgId: string, originalText: string) => {
        const newText = editValue.trim();
        if (!newText || newText === originalText) {
            setEditingId(null);
            return;
        }

        // Optimistic update
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: newText } : m));
        setEditingId(null);

        const result = await editMessage(msgId, newText, conversationId);
        if (!result.success) {
            // Revert
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: originalText } : m));
            alert(result.error || "Düzenleme başarısız.");
        } else if (result.warning) {
            // Show warning for cases like Instagram edits
            alert(result.warning);
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

    const handleTranslateMessage = async (messageId: string, text: string) => {
        if (!text) return;
        setTranslatingMessageId(messageId);
        try {
            const res = await fetch('/api/ai/correct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, action: 'translate_to_turkish' })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Çeviri başarısız oldu.');
            }

            const data = await res.json();
            if (data.translatedText) {
                setTranslations(prev => ({
                    ...prev,
                    [messageId]: {
                        text: data.translatedText,
                        detectedLanguage: data.detectedLanguage
                    }
                }));
            }
        } catch (e: any) {
            console.error('Translation error:', e);
            toast.error("Çeviri Hatası", { description: e.message });
        } finally {
            setTranslatingMessageId(null);
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

        // 2. Realtime Subscription (INSERT + UPDATE)
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
                    const newMsg = payload.new as Message;
                    setMessages((prev) => {
                        if (prev.some(m => m.id === newMsg.id)) return prev;
                        const newList = [...prev, newMsg];
                        newList.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                        return newList;
                    });
                    markConversationAsRead(conversationId);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`
                },
                (payload) => {
                    const updatedMsg = payload.new as Message;
                    setMessages((prev) =>
                        prev.map(m => m.id === updatedMsg.id ? { ...m, status: updatedMsg.status, is_read: updatedMsg.is_read, reactions: updatedMsg.reactions } : m)
                    );
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
        const textToSend = input;
        const mediaToSend = selectedCannedMedia;

        // Optimistic: metin mesajı
        const optimisticText: Message = {
            id: "temp-text-" + Date.now(),
            text: textToSend,
            sender: "HUMAN",
            created_at: new Date().toISOString(),
        };
        // Optimistic: görsel mesajı (varsa)
        const optimisticMedia: Message | null = mediaToSend ? {
            id: "temp-media-" + (Date.now() + 1),
            text: "",
            sender: "HUMAN",
            created_at: new Date().toISOString(),
            media_url: mediaToSend,
            message_type: "image",
        } : null;

        setMessages((prev) => optimisticMedia ? [...prev, optimisticText, optimisticMedia] : [...prev, optimisticText]);
        setInput("");
        setSelectedCannedMedia(null);
        setShowEmojiPicker(false);
        setShowCannedPicker(false);

        try {
            // 1. Önce metni gönder
            const { data: realTextMsg } = await sendMessage(conversationId, textToSend);
            if (realTextMsg) {
                setMessages(prev => {
                    const alreadyExists = prev.some(m => m.id === realTextMsg.id);
                    if (alreadyExists) return prev.filter(m => m.id !== optimisticText.id);
                    return prev.map(m => m.id === optimisticText.id ? (realTextMsg as Message) : m);
                });
            }

            // 2. Varsa görseli ayrı mesaj olarak gönder
            if (mediaToSend && optimisticMedia) {
                const { data: realMediaMsg } = await sendMessage(conversationId, "", mediaToSend, "image");
                if (realMediaMsg) {
                    setMessages(prev => {
                        const alreadyExists = prev.some(m => m.id === realMediaMsg.id);
                        if (alreadyExists) return prev.filter(m => m.id !== optimisticMedia.id);
                        return prev.map(m => m.id === optimisticMedia.id ? (realMediaMsg as Message) : m);
                    });
                }
            }
        } catch (err) {
            console.error("Failed to send", err);
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
                                    <div
                                        className="w-full h-full cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => {
                                            setLightboxMedia({ url: activeProfilePic, type: 'image' });
                                        }}
                                        title="Profil fotoğrafını büyüt"
                                    >
                                        <img
                                            src={activeProfilePic}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                            referrerPolicy="no-referrer"
                                        />
                                    </div>
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
                        <div className="w-3 h-3 rounded-full bg-green-500 shadow-green-500/50 shadow-lg"></div>
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

                    // 15 dk kuralı
                    const msgDate = new Date(msg.created_at);
                    const isWithin15Minutes = (Date.now() - msgDate.getTime()) < 15 * 60 * 1000;
                    const canEdit = isMe && !['image', 'video', 'audio', 'document', 'location', 'template'].includes(msg.message_type || '') && !!msg.text && isWithin15Minutes;

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
                                    ) : msg.message_type === 'template' && msg.payload ? (
                                        <div className="flex flex-col gap-2 min-w-[200px] max-w-[300px] text-sm">
                                            {/* Header Medya Önizlemesi */}
                                            {msg.payload._mediaUrl && (
                                                <div className="w-full relative rounded-md overflow-hidden bg-slate-200 flex items-center justify-center mb-1">
                                                    {msg.payload._mediaType === "IMAGE" && (
                                                        <img src={msg.payload._mediaUrl} alt="Şablon Görseli" className="max-h-[200px] object-contain w-full" />
                                                    )}
                                                    {msg.payload._mediaType === "VIDEO" && (
                                                        <video src={msg.payload._mediaUrl} controls className="max-h-[200px] w-full" />
                                                    )}
                                                    {msg.payload._mediaType === "DOCUMENT" && (
                                                        <a href={msg.payload._mediaUrl} target="_blank" className="flex items-center justify-center p-3 text-slate-600 bg-slate-100 w-full hover:bg-slate-200 transition-colors">
                                                            <FileText size={24} className="mr-2 text-red-500" />
                                                            <span className="text-xs truncate font-medium">Belgeyi Görüntüle</span>
                                                        </a>
                                                    )}
                                                </div>
                                            )}

                                            {/* Body Metni */}
                                            {msg.payload._bodyText ? (
                                                <div className="whitespace-pre-wrap leading-relaxed text-slate-800">
                                                    {msg.payload._bodyText}
                                                </div>
                                            ) : (
                                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <MessageSquare size={14} className="text-green-600" />
                                                        <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Şablon Mesajı</span>
                                                    </div>
                                                    <p className="text-sm font-medium text-slate-800">{msg.payload.name || "Şablon"}</p>
                                                    {msg.payload.language && (
                                                        <span className="text-[10px] text-green-600 bg-green-100 px-1.5 py-0.5 rounded mt-1 inline-block">{msg.payload.language}</span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Butonlar */}
                                            {msg.payload._buttons && msg.payload._buttons.length > 0 && (
                                                <div className="flex flex-col gap-1.5 mt-1 border-t pt-2 border-slate-200/60">
                                                    {msg.payload._buttons.map((btn: any, idx: number) => (
                                                        <div key={idx} className="bg-white/60 border border-slate-100 rounded-lg p-2 text-center text-blue-600 font-semibold text-xs flex items-center justify-center gap-1.5 opacity-90">
                                                            {btn.type === "URL" && <LinkIcon className="w-3.5 h-3.5" />}
                                                            {btn.type === "PHONE_NUMBER" && <Phone className="w-3.5 h-3.5" />}
                                                            {btn.type === "QUICK_REPLY" && <MousePointerClick className="w-3.5 h-3.5" />}
                                                            {btn.text}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="float-right ml-2 mt-1 flex justify-end items-center gap-1">
                                                <span className="text-[10px] text-gray-500">
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {isMe && <Check size={12} className="text-blue-500" />}
                                            </div>
                                        </div>
                                    ) : null}

                                    {msg.text && !['image', 'video', 'audio', 'document', 'location', 'template'].includes(msg.message_type || '') && (
                                        <div className={clsx("relative whitespace-pre-wrap text-sm leading-relaxed group/bubble", isEditing && "outline outline-2 outline-green-500 rounded")}>
                                            <div
                                                contentEditable={isEditing}
                                                suppressContentEditableWarning
                                                onInput={e => setEditValue((e.target as HTMLDivElement).innerText)}
                                                ref={el => { if (isEditing && el && el.innerText !== editValue) { el.innerText = editValue; /* place cursor at end */ const range = document.createRange(); const sel = window.getSelection(); range.selectNodeContents(el); range.collapse(false); sel?.removeAllRanges(); sel?.addRange(range); } }}
                                                className={clsx("focus:outline-none", isEditing && "cursor-text")}
                                                style={isEditing ? { minHeight: '1.5em' } : undefined}
                                            >
                                                {isEditing ? undefined : msg.text}
                                            </div>
                                            <div className="float-right ml-2 mt-2 flex items-center gap-1 relative z-10">
                                                {isEditing ? (
                                                    <>
                                                        <button onClick={() => setEditingId(null)} className="p-1 hover:bg-gray-100 rounded text-gray-500">
                                                            <X size={14} />
                                                        </button>
                                                        <button onClick={() => handleEditSave(msg.id, msg.text || "")} className="p-1 hover:bg-gray-100 rounded text-green-600">
                                                            <Check size={14} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="text-[10px] text-gray-500">
                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        {isMe && (
                                                            msg.is_read || msg.status === 'read'
                                                                ? <CheckCheck size={12} className="text-blue-500" />
                                                                : msg.status === 'delivered'
                                                                    ? <CheckCheck size={12} className="text-gray-400" />
                                                                    : <Check size={12} className="text-gray-400" />
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                            {/* --- INBOUND TRANSLATION UI START --- */}
                                            {msg.sender === "CUSTOMER" && (
                                                <div className="mt-2 pt-2 border-t border-slate-200/50 flex flex-col gap-1.5 w-full">
                                                    {translatingMessageId === msg.id ? (
                                                        <div className="flex items-center gap-1.5 text-xs text-blue-500 animate-pulse">
                                                            <Sparkles className="w-3 h-3" />
                                                            <span>Çevriliyor...</span>
                                                        </div>
                                                    ) : translations[msg.id] ? (
                                                        <div className="text-[13px] text-slate-700 bg-white/50 rounded p-2 italic border border-slate-100/50 shadow-sm relative pr-6">
                                                            {translations[msg.id].text}
                                                            {translations[msg.id].detectedLanguage && (
                                                                <span className="block text-[10px] text-slate-400 not-italic mt-1">
                                                                    Otomatik Algılanan Dil: <strong className="text-slate-500">{translations[msg.id].detectedLanguage}</strong>
                                                                </span>
                                                            )}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setTranslations(prev => {
                                                                        const copy = { ...prev };
                                                                        delete copy[msg.id];
                                                                        return copy;
                                                                    });
                                                                }}
                                                                className="absolute top-1.5 right-1.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200/50 transition-colors"
                                                                title="Çeviriyi Kapat"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleTranslateMessage(msg.id, msg.text || "");
                                                            }}
                                                            className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-blue-600 transition-colors self-start px-1.5 py-0.5 rounded hover:bg-blue-50"
                                                        >
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-languages"><path d="m5 8 6 6" /><path d="m4 14 6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h1" /><path d="m22 22-5-10-5 10" /><path d="M14 18h6" /></svg>
                                                            Çevir
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            {/* --- INBOUND TRANSLATION UI END --- */}
                                            {canEdit && !isEditing && (
                                                <button
                                                    onClick={() => { setEditingId(msg.id); setEditValue(msg.text || ""); }}
                                                    className="absolute top-1 right-1 opacity-0 group-hover/bubble:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-1.5 shadow-sm hover:bg-white text-gray-600 hover:text-green-600 z-20 flex items-center gap-1"
                                                    title="Düzenle (15 dk içinde)"
                                                >
                                                    <Edit2 size={13} />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Reaction Badge */}
                                {msg.reactions?.emoji && (
                                    <div className={clsx("flex", (isMe || isBot) ? "justify-end" : "justify-start")}>
                                        <span className="inline-block bg-white border border-slate-200 rounded-full px-1.5 py-0.5 text-sm shadow-sm -mt-2 relative z-10">
                                            {msg.reactions.emoji}
                                        </span>
                                    </div>
                                )}
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

                    <div className="flex items-center gap-1 md:gap-2">
                        <button
                            type="button"
                            onClick={() => document.getElementById('file-upload')?.click()}
                            className="p-1 hover:bg-orange-50/50 rounded-xl transition-all duration-300 hover:-translate-y-1 active:scale-95 shrink-0"
                            disabled={sending}
                            title="Dosya Ekleme"
                        >
                            <Image src="/icons/atac_v2.png" alt="Dosya Ekleme" width={32} height={32} className="drop-shadow-sm" />
                        </button>

                        <button
                            type="button"
                            onClick={() => { setShowLocationPicker(false); setShowEmojiPicker(false); setShowTemplatePicker(true); }}
                            className="p-1 hover:bg-orange-50/50 rounded-xl transition-all duration-300 hover:-translate-y-1 active:scale-95 shrink-0"
                            disabled={sending}
                            title="WhatsApp Şablonları"
                        >
                            <Image src="/icons/whatsapp_sablon_v2.png" alt="WhatsApp Şablonları" width={32} height={32} className="drop-shadow-sm" />
                        </button>

                        <button
                            type="button"
                            onClick={() => { setShowEmojiPicker(false); setShowLocationPicker(!showLocationPicker); }}
                            className="p-1 hover:bg-orange-50/50 rounded-xl transition-all duration-300 hover:-translate-y-1 active:scale-95 shrink-0"
                            disabled={sending}
                            title="Konum"
                        >
                            <Image src="/icons/konum_v2.png" alt="Konum" width={32} height={32} className="drop-shadow-sm" />
                        </button>

                        <button
                            type="button"
                            onClick={() => { setShowLocationPicker(false); setShowEmojiPicker(!showEmojiPicker); }}
                            className="p-1 rounded-xl transition-all duration-300 hover:-translate-y-1 active:scale-95 hover:bg-orange-50/50 shrink-0"
                            title="Emojiler"
                        >
                            <Image src="/icons/emoji_v3.png" alt="Emojiler" width={32} height={32} className="drop-shadow-sm" />
                        </button>

                        <CannedResponsesPicker
                            tenantId={tenantId}
                            open={showCannedPicker}
                            onOpenChange={setShowCannedPicker}
                            onSelect={(resp) => {
                                setInput(resp.content);
                                setSelectedCannedMedia(resp.media_url || null);
                                setShowCannedPicker(false);
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => setShowCannedPicker((prev) => !prev)}
                                title="Hazır Cevap Şablonları"
                                className="p-1 hover:bg-orange-50/50 rounded-xl transition-all duration-300 hover:-translate-y-1 active:scale-95 shrink-0"
                            >
                                <Image src="/icons/hazir_cevap_v2.png" alt="Hazır Cevaplar" width={32} height={32} className="drop-shadow-sm" />
                            </button>
                        </CannedResponsesPicker>
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

                            {/* Medya önizlemesi (canned response'dan geliyorsa) */}
                            <div className="flex-1 relative flex flex-col gap-1">
                                {selectedCannedMedia && (
                                    <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 rounded-md border border-blue-200">
                                        <img src={selectedCannedMedia} alt="Ek görsel" className="h-8 w-8 rounded object-cover border" />
                                        <span className="text-xs text-blue-700 flex-1">Görsel mesajla birlikte gönderilecek</span>
                                        <button type="button" onClick={() => setSelectedCannedMedia(null)} className="text-blue-400 hover:text-red-500">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                                <div className="relative flex items-center">
                                    <TextareaAutosize
                                        minRows={1}
                                        maxRows={6}
                                        value={input}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setInput(val);
                                            if (val.startsWith("/")) {
                                                setShowCannedPicker(true);
                                            } else {
                                                setShowCannedPicker(false);
                                            }
                                        }}
                                        onFocus={() => setIsInputFocused(true)}
                                        onBlur={() => setIsInputFocused(false)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend(e as unknown as React.FormEvent);
                                            }
                                        }}
                                        placeholder={platform === 'instagram' ? "Mesaj yazın (Alt satır için Shift+Enter) veya '/' ile hazır cevap seçin (Belge gönderilemez)..." : "Mesaj yazın (Alt satır için Shift+Enter) veya '/' ile hazır cevap seçin..."}
                                        className="w-full bg-[#f0f2f5] border-gray-200 text-gray-900 placeholder:text-gray-500 rounded-md focus-visible:ring-1 focus-visible:outline-none focus:outline-none focus-visible:ring-orange-500 focus-visible:border-orange-500 text-base md:text-[15px] pr-[220px] py-2.5 pl-3 resize-none shadow-sm transition-all"
                                    />
                                    {currentMode === 'HUMAN' && (
                                        <div className="absolute right-3 bottom-1.5 flex items-center gap-1.5 z-10 bg-[#f0f2f5] pl-1 pr-1 rounded-md">
                                            <TranslateButton
                                                input={input}
                                                onTranslated={setInput}
                                                detectedLanguage={lastDetectedLanguage}
                                            />
                                            <AiCorrectButton
                                                input={input}
                                                onCorrected={setInput}
                                                isEnabled={true}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Ses Kaydetme - Sağ Taraf */}
                            {!isRecording && !input.trim() && (
                                <button
                                    type="button"
                                    onClick={startRecording}
                                    className="h-10 w-10 hover:bg-orange-50/50 rounded-xl transition-all duration-300 hover:-translate-y-1 active:scale-95 flex items-center justify-center shrink-0"
                                    title="Ses Kaydetme"
                                    disabled={sending}
                                >
                                    <Image src="/icons/seskayit_v2.png" alt="Ses Kaydetme" width={24} height={24} className="drop-shadow-sm object-contain" />
                                </button>
                            )}
                        </>
                    )}

                    {input.trim() && (
                        <Button type="submit" disabled={sending || currentMode === 'BOT'} className="bg-orange-600 hover:bg-orange-700">
                            <Send className="w-4 h-4" />
                        </Button>
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

            <TemplatePickerModal
                open={showTemplatePicker}
                onOpenChange={setShowTemplatePicker}
                tenantId={tenantId}
                onSelectTemplate={async (name, language, components, fullTemplate, variables) => {
                    setSending(true);
                    try {
                        // fullTemplate'ten serileştirilebilir display verilerini çıkar
                        // sendToChannel sadece name/language/components kullanır — _önekli alanlar gönderimi ETKİLEMEZ
                        let bodyText = fullTemplate?.components?.find((c: any) => c.type === "BODY")?.text || "";
                        // Değişken değerlerini body text'e uygula
                        if (variables) {
                            Object.entries(variables).forEach(([k, v]) => {
                                if (k.startsWith('body_')) {
                                    const varName = k.slice(5);
                                    bodyText = bodyText.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), String(v));
                                }
                            });
                        }

                        const payload = {
                            name,
                            language,
                            components,
                            // Display verileri (gönderimi etkilemez, sadece chat render için)
                            _bodyText: bodyText,
                            _mediaUrl: fullTemplate?.uppypro_media?.file_url || null,
                            _mediaType: fullTemplate?.uppypro_media?.file_type || null,
                            _buttons: fullTemplate?.components?.find((c: any) => c.type === "BUTTONS")?.buttons?.map((btn: any) => ({ type: btn.type, text: btn.text, url: btn.url })) || null,
                        };
                        const displayTitle = "Şablon Gönderildi\nSeçilen Şablon Adı: " + name;

                        const optimisticMsg: Message = {
                            id: "temp-" + Date.now(),
                            text: displayTitle,
                            sender: "HUMAN",
                            created_at: new Date().toISOString(),
                            message_type: 'template',
                            payload: payload
                        };
                        setMessages((prev) => [...prev, optimisticMsg]);

                        const { sendMessage } = await import("@/app/actions/chat");
                        const result = await sendMessage(conversationId, displayTitle, undefined, 'template', undefined, payload);

                        // sendMessage artık throw etmiyor, error ile return ediyor
                        if (result?.error) {
                            alert("Şablon gönderilirken hata oluştu: " + result.error);
                        }
                    } catch (err: any) {
                        alert("Şablon gönderilirken hata oluştu: " + err.message);
                    } finally {
                        setSending(false);
                    }
                }}
            />
        </div >
    );
}
