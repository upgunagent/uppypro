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
    Instagram,
    MessageCircle,
    UserCircle
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


    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.refresh();
        router.push("/login");
    };

    const adminLinks = [
        { href: "/admin/tenants", label: "İşletmeler", icon: Users },
    ];

    // Helper for Sidebar Items
    // Helper for Sidebar Items
    const SidebarItem = ({ href, icon: Icon, label, isActive, count, gradient = "bg-slate-100", iconColor = "text-slate-600" }: any) => (
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
            <div className="w-20 bg-white border-r border-slate-100 flex flex-col h-screen fixed left-0 top-0 items-center py-6 z-50 shadow-sm">
                <div className="mb-8 p-2 rounded-xl bg-primary/5 text-primary">
                    <LayoutDashboard size={24} />
                </div>
                <nav className="flex-1 space-y-4 w-full flex flex-col items-center">
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
                <div className="p-4 border-t border-slate-100 w-full flex justify-center">
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

    // Tenant/User View
    return (
        <div className="w-20 bg-white border-r border-slate-100 flex flex-col h-screen fixed left-0 top-0 items-center py-6 z-50 shadow-sm">
            <div className="mb-8 hover:scale-105 transition-transform duration-300">
                <Image
                    src="/brand-logo.png"
                    alt="UP"
                    width={60}
                    height={60}
                    className="w-[60px] h-[60px] object-contain drop-shadow-sm"
                    priority
                />
            </div>

            <div className="flex-1 w-full space-y-6 flex flex-col items-center">
                {/* Main Navigation */}
                <div className="space-y-6 flex flex-col items-center w-full">
                    <SidebarItem
                        href="/panel/inbox?tab=all"
                        icon={MessageSquare}
                        label="Tüm Mesajlar"
                        isActive={pathname.includes('/inbox') && currentTab === 'all'}
                        gradient="bg-gradient-to-tr from-blue-500 to-indigo-600 shadow-blue-500/20"
                        iconColor="text-white"
                        count={counts.all}
                    />
                    <SidebarItem
                        href="/panel/inbox?tab=whatsapp"
                        icon={MessageCircle}
                        label="WhatsApp"
                        isActive={pathname.includes('/inbox') && currentTab === 'whatsapp'}
                        gradient="bg-gradient-to-tr from-green-500 to-emerald-600 shadow-green-500/20"
                        iconColor="text-white"
                        count={counts.whatsapp}
                    />
                    <SidebarItem
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
