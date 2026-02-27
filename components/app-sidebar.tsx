"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import {
    LayoutDashboard,
    MessageSquare,
    Settings,
    Users,
    LogOut,
    Building2,
    Instagram,
    MessageCircle,
    UserCircle,
    Tag,
    Calendar as CalendarIcon,
    Receipt,
    Lock,
    Bell
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

interface SidebarProps {
    role: "agency_admin" | "tenant_owner" | "tenant_agent" | null;
    tenantId?: string;
}

export function AppSidebar({ role, tenantId }: SidebarProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentTab = searchParams.get('tab') || 'all';
    const router = useRouter();
    const [counts, setCounts] = useState({ all: 0, whatsapp: 0, instagram: 0 });
    const [notificationCount, setNotificationCount] = useState(0);
    const prevNotifCountRef = useRef(0);
    const userInteractedRef = useRef(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (!tenantId) return;

        const supabase = createClient();

        const fetchCounts = async () => {
            const { data: messages } = await supabase
                .from('messages')
                .select(`
                    conversations!inner (
                        channel
                    )
                `)
                .eq('tenant_id', tenantId)
                .eq('is_read', false)
                .eq('direction', 'IN');

            if (messages) {
                const newCounts = { all: 0, whatsapp: 0, instagram: 0 };
                messages.forEach((msg: any) => {
                    const channel = msg.conversations?.channel;
                    newCounts.all++;
                    if (channel === 'whatsapp') newCounts.whatsapp++;
                    if (channel === 'instagram') newCounts.instagram++;
                });
                setCounts(newCounts);
            }
        };

        fetchCounts();

        const channel = supabase
            .channel(`sidebar-unreads:${tenantId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages',
                    filter: `tenant_id=eq.${tenantId}`
                },
                () => {
                    fetchCounts();
                }
            )
            .subscribe();


        // Polling Fallback specifically for unread counts (every 10s)
        const interval = setInterval(fetchCounts, 10000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [tenantId]);

    // Track user interaction for autoplay policy
    useEffect(() => {
        const handler = () => {
            userInteractedRef.current = true;
            import('@/lib/notification-sound').then(({ initNotificationSound }) => {
                if (initNotificationSound) initNotificationSound();
            });
        };
        document.addEventListener('click', handler, { once: true });
        document.addEventListener('keydown', handler, { once: true });
        return () => {
            document.removeEventListener('click', handler);
            document.removeEventListener('keydown', handler);
        };
    }, []);

    // Notification count + realtime + sound
    useEffect(() => {
        if (!tenantId) return;
        const supabase = createClient();

        const fetchNotifCount = async () => {
            const { count } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
                .eq('is_read', false);

            const newCount = count || 0;
            // Play sound if new notifications arrived
            if (newCount > prevNotifCountRef.current && prevNotifCountRef.current >= 0 && userInteractedRef.current) {
                import('@/lib/notification-sound').then(({ playNotificationSound }) => {
                    playNotificationSound();
                });
            }
            prevNotifCountRef.current = newCount;
            setNotificationCount(newCount);
        };

        fetchNotifCount();

        const notifChannel = supabase
            .channel(`sidebar-notifications:${tenantId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications'
                },
                () => {
                    fetchNotifCount();
                }
            )
            .subscribe();

        const notifInterval = setInterval(fetchNotifCount, 15000);

        return () => {
            supabase.removeChannel(notifChannel);
            clearInterval(notifInterval);
        };
    }, [tenantId]);


    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    useEffect(() => {
        const supabase = createClient();
        let channel: any;

        const getProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Initial fetch
            const { data: profile } = await supabase
                .from('profiles')
                .select('avatar_url')
                .eq('user_id', user.id)
                .single();

            if (profile?.avatar_url) {
                setAvatarUrl(profile.avatar_url);
            }

            // Realtime subscription
            channel = supabase
                .channel(`sidebar-profile:${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'profiles',
                        filter: `user_id=eq.${user.id}`
                    },
                    (payload: any) => {
                        // null check is important because user might remove photo
                        setAvatarUrl(payload.new.avatar_url);
                    }
                )
                .subscribe();
        };

        getProfile();

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, []);


    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.refresh();
        router.push("/login");
    };

    const adminLinks = [
        { href: "/admin/tenants", label: "İşletmeler", icon: Users },
        { href: "/admin/transactions", label: "İşlemler", icon: Receipt },
        { href: "/admin/enterprise", label: "Kurumsal", icon: Building2 },
        { href: "/admin/pricing", label: "Fiyatlandırma", icon: Tag },
        { href: "/admin/cancellations", label: "İptal Talepleri", icon: LogOut },
        { href: "/admin/notifications", label: "Bildirim Gönder", icon: Bell },
        { href: "/admin/settings", label: "Ayarlar", icon: Settings },
    ];

    const AdminSidebarItem = ({ href, icon: Icon, label, isActive, count }: any) => (
        <Link
            href={href}
            className={clsx(
                "group relative flex items-center w-full px-4 py-3 rounded-xl transition-all duration-200",
                isActive
                    ? `bg-orange-50 text-orange-600 font-semibold shadow-sm border-r-4 border-orange-500`
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
        >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className={clsx("flex-shrink-0 mr-3 transition-colors", isActive ? "text-orange-600" : "text-slate-500 group-hover:text-slate-700")} />

            <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{label}</span>

            {/* Notification Badge */}
            {count > 0 && (
                <div className="flex-shrink-0 ml-2 inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 bg-red-500 text-white text-[11px] font-bold rounded-full shadow-sm animate-in zoom-in">
                    {count > 99 ? '99+' : count}
                </div>
            )}
        </Link>
    );

    const TenantSidebarItem = ({ href, icon: Icon, label, isActive, count, gradient = "bg-slate-100", iconColor = "text-slate-600" }: any) => (
        <Link
            href={href}
            className={clsx(
                "group relative flex flex-col items-center justify-center w-[54px] h-[54px] rounded-[20px] transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105 active:scale-95",
                gradient,
                isActive ? "ring-[3px] ring-offset-2 ring-slate-200 scale-105" : "opacity-90 hover:opacity-100"
            )}
        >
            <Icon size={28} strokeWidth={2.5} className={clsx("transition-transform", iconColor)} />

            {/* Notification Badge */}
            {count > 0 && (
                <div className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[22px] h-[22px] px-1 bg-red-600 border-[2px] border-white text-white text-[11px] font-bold rounded-full shadow-lg z-10 animate-in zoom-in">
                    {count > 99 ? '99+' : count}
                </div>
            )}

            {/* Hover Tooltip */}
            <div className="absolute left-[64px] px-3 py-1.5 bg-slate-900 text-white text-sm font-medium rounded-lg opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl">
                {label}
                <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[4px] border-t-transparent border-r-[4px] border-r-slate-900 border-b-[4px] border-b-transparent"></div>
            </div>
        </Link>
    );

    // Agency Admin View
    if (role === "agency_admin") {
        return (
            <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen fixed left-0 top-0 py-6 z-50 shadow-sm">
                <div className="px-6 mb-8 flex items-center justify-center">
                    <Link href="/admin/tenants" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <Image
                            src="/brand-logo.png"
                            alt="UppyPro"
                            width={300}
                            height={120}
                            className="h-24 w-auto object-contain"
                            priority
                        />
                    </Link>
                </div>

                <div className="px-4 mb-2 text-xs font-bold tracking-wider text-slate-400 uppercase">Yönetim Paneli</div>
                <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
                    {adminLinks.map((link) => (
                        <AdminSidebarItem
                            key={link.href}
                            href={link.href}
                            icon={link.icon}
                            label={link.label}
                            isActive={pathname.startsWith(link.href)}
                        />
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-100 flex flex-col gap-2 mt-auto">
                    <Link
                        href="/admin/password"
                        className="flex items-center w-full gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors font-medium"
                    >
                        <Lock size={20} />
                        <span>Şifre Değiştir</span>
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors font-medium"
                    >
                        <LogOut size={20} />
                        <span>Çıkış Yap</span>
                    </button>
                </div>
            </div>
        );
    }

    // Tenant/User View
    return (
        <div className="hidden md:flex w-20 bg-white border-r border-slate-100 flex-col h-screen fixed left-0 top-0 items-center py-6 z-50 shadow-sm">
            <div className="mb-8 hover:scale-105 transition-transform duration-300">
                {avatarUrl ? (
                    <Image
                        src={avatarUrl}
                        alt="Profile"
                        width={60}
                        height={60}
                        className="w-[60px] h-[60px] object-cover rounded-full drop-shadow-sm border border-slate-200"
                        priority
                    />
                ) : (
                    <Image
                        src="/brand-logo.png"
                        alt="UP"
                        width={60}
                        height={60}
                        className="w-[60px] h-[60px] object-contain drop-shadow-sm"
                        priority
                    />
                )}
            </div>

            <div className="flex-1 w-full space-y-6 flex flex-col items-center">
                {/* Main Navigation */}
                <div className="space-y-6 flex flex-col items-center w-full">
                    <TenantSidebarItem
                        href="/panel/inbox?tab=all"
                        icon={MessageSquare}
                        label="Tüm Mesajlar"
                        isActive={pathname.includes('/inbox') && currentTab === 'all'}
                        gradient="bg-gradient-to-tr from-blue-500 to-indigo-600 shadow-blue-500/20"
                        iconColor="text-white"
                        count={counts.all}
                    />
                    <TenantSidebarItem
                        href="/panel/inbox?tab=whatsapp"
                        icon={MessageCircle}
                        label="WhatsApp"
                        isActive={pathname.includes('/inbox') && currentTab === 'whatsapp'}
                        gradient="bg-gradient-to-tr from-green-500 to-emerald-600 shadow-green-500/20"
                        iconColor="text-white"
                        count={counts.whatsapp}
                    />
                    <TenantSidebarItem
                        href="/panel/inbox?tab=instagram"
                        icon={Instagram}
                        label="Instagram"
                        isActive={pathname.includes('/inbox') && currentTab === 'instagram'}
                        gradient="bg-gradient-to-tr from-rose-500 via-red-500 to-orange-500 shadow-orange-500/20"
                        iconColor="text-white"
                        count={counts.instagram}
                    />
                </div>
            </div>

            <div className="p-4 border-t border-slate-100 w-full space-y-4 flex flex-col items-center">
                <TenantSidebarItem
                    href="/panel/calendar"
                    icon={CalendarIcon}
                    label="Takvim"
                    isActive={pathname.startsWith("/panel/calendar")}
                    gradient="bg-sky-500 shadow-sky-500/20"
                    iconColor="text-white"
                />
                <TenantSidebarItem
                    href="/panel/customers"
                    icon={Users}
                    label="Müşteriler"
                    isActive={pathname.startsWith("/panel/customers")}
                    gradient="bg-orange-500 shadow-orange-500/20"
                    iconColor="text-white"
                />
                <TenantSidebarItem
                    href="/panel/notifications"
                    icon={Bell}
                    label="Bildirimler"
                    isActive={pathname.startsWith("/panel/notifications")}
                    gradient="bg-amber-500 shadow-amber-500/20"
                    iconColor="text-white"
                    count={notificationCount}
                />
                <TenantSidebarItem
                    href="/panel/settings"
                    icon={Settings}
                    label="Ayarlar"
                    isActive={pathname.startsWith("/panel/settings")}
                    gradient="bg-purple-500 shadow-purple-500/20"
                    iconColor="text-white"
                />
                <button
                    onClick={handleLogout}
                    className="group relative flex items-center justify-center w-12 h-12 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                >
                    <LogOut size={20} />
                    <div className="absolute left-14 px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-md opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                        Çıkış Yap
                        <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[4px] border-t-transparent border-r-[4px] border-r-slate-800 border-b-[4px] border-b-transparent"></div>
                    </div>
                </button>
            </div>
        </div>
    );
}
