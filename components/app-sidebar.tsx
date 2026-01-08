"use client";

import Link from "next/link";
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
    const SidebarItem = ({ href, icon: Icon, label, isActive, count, colorClass = "text-slate-500", activeColorClass = "text-primary bg-primary/10", countColorClass = "bg-red-500 text-white" }: any) => (
        <Link
            href={href}
            className={clsx(
                "group relative flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-200",
                isActive
                    ? activeColorClass
                    : "hover:bg-slate-100 text-slate-500"
            )}
        >
            <Icon size={24} strokeWidth={1.5} className={clsx("transition-transform group-hover:scale-110", isActive && "text-primary")} />

            {/* Notification Badge */}
            {count > 0 && (
                <span className={clsx("absolute top-2 right-2 flex h-2.5 w-2.5 items-center justify-center rounded-full ring-2 ring-white", countColorClass)}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                </span>
            )}

            {/* Hover Tooltip */}
            <div className="absolute left-14 px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-md opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                {label}
                {/* Triangle */}
                <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[4px] border-t-transparent border-r-[4px] border-r-slate-800 border-b-[4px] border-b-transparent"></div>
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
            <div className="mb-8 p-2 rounded-xl bg-primary/5 text-primary">
                {/* Logo or Brand Icon */}
                <span className="font-bold text-xl">UP</span>
            </div>

            <div className="flex-1 w-full space-y-6 flex flex-col items-center">
                {/* Main Navigation */}
                <div className="space-y-4 flex flex-col items-center w-full">
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
                        activeColorClass="text-green-600 bg-green-50"
                        count={counts.whatsapp}
                        countColorClass="bg-green-500"
                    />
                    <SidebarItem
                        href="/panel/inbox?tab=instagram"
                        icon={Instagram}
                        label="Instagram"
                        isActive={pathname.includes('/inbox') && currentTab === 'instagram'}
                        activeColorClass="text-pink-600 bg-pink-50"
                        count={counts.instagram}
                        countColorClass="bg-pink-500"
                    />
                </div>
            </div>

            <div className="p-4 border-t border-slate-100 w-full space-y-2 flex flex-col items-center">
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
