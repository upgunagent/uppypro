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

        return () => {
            supabase.removeChannel(channel);
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

    // Agency Admin View
    if (role === "agency_admin") {
        return (
            <div className="w-64 border-r border-white/10 bg-slate-950 flex flex-col h-screen fixed left-0 top-0">
                <div className="h-16 flex items-center px-6 border-b border-white/10">
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-white">
                        UppyPro
                    </span>
                    <span className="ml-2 text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">ADMIN</span>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    {adminLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                pathname.startsWith(link.href)
                                    ? "bg-primary/10 text-primary border border-primary/20"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <link.icon size={18} />
                            {link.label}
                        </Link>
                    ))}
                </nav>
                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 w-full rounded-lg transition-colors"
                    >
                        <LogOut size={18} />
                        Çıkış Yap
                    </button>
                </div>
            </div>
        );
    }

    // Tenant/User View
    return (
        <div className="w-64 border-r border-white/10 bg-slate-950 flex flex-col h-screen fixed left-0 top-0">
            <div className="h-16 flex items-center px-6 border-b border-white/10">
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-white">
                    UppyPro
                </span>
            </div>

            <div className="flex-1 p-4 space-y-6">
                {/* Inbox Section */}
                <div>
                    <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        INBOX
                    </h3>
                    <div className="space-y-1">
                        <Link
                            href="/panel/inbox?tab=all"
                            className={clsx(
                                "flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                (pathname.includes('/inbox') && currentTab === 'all')
                                    ? "bg-primary/10 text-primary border border-primary/20"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <MessageSquare size={18} />
                                Tüm Mesajlar
                            </div>
                            {counts.all > 0 && (
                                <span className={clsx(
                                    "px-2 py-0.5 rounded-full text-xs font-bold",
                                    (pathname.includes('/inbox') && currentTab === 'all')
                                        ? "bg-primary text-white"
                                        : "bg-white/10 text-gray-200"
                                )}>
                                    {counts.all}
                                </span>
                            )}
                        </Link>
                        <Link
                            href="/panel/inbox?tab=whatsapp"
                            className={clsx(
                                "flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                (pathname.includes('/inbox') && currentTab === 'whatsapp')
                                    ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <MessageCircle size={18} />
                                WhatsApp
                            </div>
                            {counts.whatsapp > 0 && (
                                <span className={clsx(
                                    "px-2 py-0.5 rounded-full text-xs font-bold",
                                    (pathname.includes('/inbox') && currentTab === 'whatsapp')
                                        ? "bg-green-500 text-black"
                                        : "bg-green-500/20 text-green-400"
                                )}>
                                    {counts.whatsapp}
                                </span>
                            )}
                        </Link>
                        <Link
                            href="/panel/inbox?tab=instagram"
                            className={clsx(
                                "flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                (pathname.includes('/inbox') && currentTab === 'instagram')
                                    ? "bg-pink-500/10 text-pink-400 border border-pink-500/20"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <Instagram size={18} />
                                Instagram
                            </div>
                            {counts.instagram > 0 && (
                                <span className={clsx(
                                    "px-2 py-0.5 rounded-full text-xs font-bold",
                                    (pathname.includes('/inbox') && currentTab === 'instagram')
                                        ? "bg-pink-500 text-white"
                                        : "bg-pink-500/20 text-pink-400"
                                )}>
                                    {counts.instagram}
                                </span>
                            )}
                        </Link>
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-white/10 space-y-1">
                <Link
                    href="/panel/settings"
                    className={clsx(
                        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                        pathname.startsWith("/panel/settings")
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "text-gray-400 hover:text-white hover:bg-white/5"
                    )}
                >
                    <Settings size={18} />
                    Ayarlar
                </Link>
                <Link
                    href="#" // Placeholder for profile, maybe /panel/profile if it exists
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                    <UserCircle size={18} />
                    Profilim
                </Link>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 w-full rounded-lg transition-colors"
                >
                    <LogOut size={18} />
                    Çıkış Yap
                </button>
            </div>
        </div>
    );
}
