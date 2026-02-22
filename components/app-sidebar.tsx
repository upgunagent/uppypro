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
    Receipt
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
        { href: "/admin/settings", label: "Ayarlar", icon: Settings },
    ];

    // Helper for Sidebar Items
    // Helper for Sidebar Items
    const SidebarItem = ({ href, icon: Icon, label, isActive, count, gradient = "bg-orange-50 text-orange-600", iconColor = "text-orange-600" }: any) => (
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
                        <SidebarItem
                            key={link.href}
                            href={link.href}
                            icon={link.icon}
                            label={link.label}
                            isActive={pathname.startsWith(link.href)}
                        />
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-100 flex items-center">
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
        <div className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col h-screen fixed left-0 top-0 py-6 z-50 shadow-sm">
            <div className="px-6 mb-8 flex items-center gap-4 hover:scale-[1.02] transition-transform duration-300">
                {avatarUrl ? (
                    <Image
                        src={avatarUrl}
                        alt="Profile"
                        width={48}
                        height={48}
                        className="w-12 h-12 object-cover rounded-full drop-shadow-sm border border-slate-200"
                        priority
                    />
                ) : (
                    <Image
                        src="/brand-logo.png"
                        alt="UP"
                        width={48}
                        height={48}
                        className="w-12 h-12 object-contain drop-shadow-sm"
                        priority
                    />
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">İşletme Hesabı</p>
                    <p className="text-xs text-slate-500 truncate">UppyPro Panel</p>
                </div>
            </div>

            <div className="flex-1 w-full flex flex-col px-3 overflow-y-auto">
                <div className="mb-2 px-2 text-xs font-bold tracking-wider text-slate-400 uppercase">Gelen Kutusu</div>
                <div className="space-y-1 mb-6">
                    <SidebarItem
                        href="/panel/inbox?tab=all"
                        icon={MessageSquare}
                        label="Tüm Mesajlar"
                        isActive={pathname.includes('/inbox') && currentTab === 'all'}
                        count={counts.all}
                    />
                    <SidebarItem
                        href="/panel/inbox?tab=whatsapp"
                        icon={MessageCircle}
                        label="WhatsApp"
                        isActive={pathname.includes('/inbox') && currentTab === 'whatsapp'}
                        count={counts.whatsapp}
                    />
                    <SidebarItem
                        href="/panel/inbox?tab=instagram"
                        icon={Instagram}
                        label="Instagram"
                        isActive={pathname.includes('/inbox') && currentTab === 'instagram'}
                        count={counts.instagram}
                    />
                </div>

                <div className="mb-2 px-2 text-xs font-bold tracking-wider text-slate-400 uppercase">Yönetim</div>
                <div className="space-y-1">
                    <SidebarItem
                        href="/panel/calendar"
                        icon={CalendarIcon}
                        label="Takvim"
                        isActive={pathname.startsWith("/panel/calendar")}
                    />
                    <SidebarItem
                        href="/panel/customers"
                        icon={Users}
                        label="Müşteriler"
                        isActive={pathname.startsWith("/panel/customers")}
                    />
                    <SidebarItem
                        href="/panel/settings"
                        icon={Settings}
                        label="Ayarlar"
                        isActive={pathname.startsWith("/panel/settings")}
                    />
                </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center mt-auto">
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
