"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
    LayoutDashboard,
    MessageSquare,
    Settings,
    Users,
    LogOut
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface SidebarProps {
    role: "agency_admin" | "tenant_owner" | "tenant_agent" | null;
}

export function AppSidebar({ role }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.refresh();
        router.push("/login");
    };

    const adminLinks = [
        { href: "/admin/tenants", label: "İşletmeler", icon: Users },
    ];

    const panelLinks = [
        { href: "/panel/inbox", label: "Inbox", icon: MessageSquare },
        { href: "/panel/settings", label: "Ayarlar", icon: Settings },
    ];

    const links = role === "agency_admin" ? adminLinks : panelLinks;

    return (
        <div className="w-64 border-r border-white/10 bg-slate-950 flex flex-col h-screen fixed left-0 top-0">
            <div className="h-16 flex items-center px-6 border-b border-white/10">
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-white">
                    UppyPro
                </span>
                {role === "agency_admin" && <span className="ml-2 text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">ADMIN</span>}
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname.startsWith(link.href);
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-primary/10 text-primary border border-primary/20"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <Icon size={18} />
                            {link.label}
                        </Link>
                    );
                })}
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
