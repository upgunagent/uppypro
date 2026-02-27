"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { playNotificationSound, initNotificationSound } from "@/lib/notification-sound";
import { createClient } from "@/lib/supabase/client";
import { markNotificationRead, markAllNotificationsRead, deleteNotification, deleteAllNotifications } from "@/app/actions/notifications";
import { Bell, BellRing, Check, CheckCheck, MessageSquare, Megaphone, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Notification {
    id: string;
    tenant_id: string | null;
    type: string;
    title: string;
    message: string;
    metadata: any;
    is_read: boolean;
    created_at: string;
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const prevCountRef = useRef<number>(0);
    const userInteractedRef = useRef<boolean>(false);

    // Track user interaction for autoplay policy
    useEffect(() => {
        const handler = () => {
            userInteractedRef.current = true;
            initNotificationSound();
        };
        document.addEventListener('click', handler, { once: true });
        document.addEventListener('keydown', handler, { once: true });
        return () => {
            document.removeEventListener('click', handler);
            document.removeEventListener('keydown', handler);
        };
    }, []);

    const fetchNotifications = useCallback(async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: member } = await supabase
            .from("tenant_members")
            .select("tenant_id")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();

        if (!member) return;

        const { data } = await supabase
            .from("notifications")
            .select("*")
            .or(`tenant_id.eq.${member.tenant_id},tenant_id.is.null`)
            .order("created_at", { ascending: false })
            .limit(50);

        if (data) {
            const newUnreadCount = data.filter(n => !n.is_read).length;

            // Play sound if there are new unread notifications
            if (newUnreadCount > prevCountRef.current && userInteractedRef.current) {
                playNotificationSound();
            }
            prevCountRef.current = newUnreadCount;

            setNotifications(data);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchNotifications();

        const supabase = createClient();
        const channel = supabase
            .channel("notifications-page-realtime")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications"
                },
                () => {
                    fetchNotifications();
                }
            )
            .subscribe();

        const interval = setInterval(fetchNotifications, 15000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [fetchNotifications]);

    const handleMarkRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        await markNotificationRead(id);
    };

    const handleMarkAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        await markAllNotificationsRead();
    };

    const handleDelete = async (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        await deleteNotification(id);
    };

    const handleDeleteAll = async () => {
        setNotifications([]);
        await deleteAllNotifications();
    };

    const handleGoToChat = async (notification: Notification) => {
        if (!notification.is_read) {
            await handleMarkRead(notification.id);
        }
        const chatId = notification.metadata?.chat_id;
        if (chatId) {
            router.push(`/panel/inbox?tab=all&chatId=${chatId}`);
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "Az önce";
        if (diffMins < 60) return `${diffMins} dk önce`;
        if (diffHours < 24) return `${diffHours} saat önce`;
        if (diffDays < 7) return `${diffDays} gün önce`;
        return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full p-4 md:p-8 max-w-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                        <Bell className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Bildirimler</h1>
                        <p className="text-sm text-slate-500">
                            {unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : "Tüm bildirimler okundu"}
                        </p>
                    </div>
                </div>
                {notifications.length > 0 && (
                    <div className="flex gap-2">
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors"
                            >
                                <CheckCheck className="w-4 h-4" />
                                Tümünü Okundu Yap
                            </button>
                        )}
                        <button
                            onClick={handleDeleteAll}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Tümünü Sil
                        </button>
                    </div>
                )}
            </div>

            {/* Notification List */}
            {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Bell className="w-16 h-16 mb-4 opacity-30" />
                    <p className="text-lg font-medium">Henüz bildirim yok</p>
                    <p className="text-sm">Yeni bildirimler geldiğinde burada görünecek.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`relative rounded-2xl border transition-all duration-200 ${notification.is_read
                                ? "bg-white border-slate-100"
                                : "bg-amber-50/50 border-amber-200 shadow-sm"
                                }`}
                        >
                            <button
                                onClick={() => handleDelete(notification.id)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors z-10"
                                title="Sil"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <div className="p-4 pr-14">
                                <div className="flex items-start gap-3">
                                    {/* Icon */}
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${notification.type === "AI_ESCALATION"
                                        ? "bg-red-100"
                                        : "bg-blue-100"
                                        }`}>
                                        {notification.type === "AI_ESCALATION" ? (
                                            <BellRing className="w-5 h-5 text-red-600" />
                                        ) : (
                                            <Megaphone className="w-5 h-5 text-blue-600" />
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className={`text-sm font-semibold ${notification.is_read ? "text-slate-700" : "text-slate-900"
                                                }`}>
                                                {notification.title}
                                            </h3>
                                            {!notification.is_read && (
                                                <span className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-600 leading-relaxed mb-2">
                                            {notification.message}
                                        </p>

                                        {/* Customer info if AI_ESCALATION */}
                                        {notification.type === "AI_ESCALATION" && notification.metadata?.customer_name && (
                                            <div className="text-xs text-slate-500 mb-2">
                                                👤 <strong>{notification.metadata.customer_name}</strong>
                                                {notification.metadata.customer_number && (
                                                    <span> · {notification.metadata.customer_number}</span>
                                                )}
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 mt-2">
                                            {notification.type === "AI_ESCALATION" && notification.metadata?.chat_id && (
                                                <button
                                                    onClick={() => handleGoToChat(notification)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                                                >
                                                    <MessageSquare className="w-3.5 h-3.5" />
                                                    Sohbeti Görüntüle
                                                </button>
                                            )}
                                            {!notification.is_read && (
                                                <button
                                                    onClick={() => handleMarkRead(notification.id)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                    Okundu
                                                </button>
                                            )}
                                            <span className="ml-auto text-xs text-slate-400">
                                                {formatDate(notification.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
