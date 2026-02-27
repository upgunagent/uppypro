"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Calendar, Users, Settings, LogOut, MessageSquare, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function MobileBottomNav() {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.refresh();
        router.push("/login");
    };

    const NavItem = ({ href, icon: Icon, label, isActive }: { href: string; icon: any; label: string; isActive: boolean }) => (
        <Link
            href={href}
            className={clsx(
                "flex flex-col items-center justify-center flex-1 py-3 gap-1 transition-colors",
                isActive ? "text-orange-600" : "text-slate-500 hover:text-slate-900"
            )}
        >
            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "-mt-1 mb-1 transition-all" : "transition-all"} />
            <span className={clsx("text-[10px] font-medium", isActive ? "font-bold" : "")}>{label}</span>
        </Link>
    );

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 flex items-center justify-around pb-safe h-[60px]">
            <NavItem
                href="/panel/inbox?tab=all"
                icon={MessageSquare}
                label="Mesajlar"
                isActive={pathname.includes("/panel/inbox")}
            />
            <NavItem
                href="/panel/calendar"
                icon={Calendar}
                label="Takvim"
                isActive={pathname.startsWith("/panel/calendar")}
            />
            <NavItem
                href="/panel/customers"
                icon={Users}
                label="Müşteriler"
                isActive={pathname.startsWith("/panel/customers")}
            />
            <NavItem
                href="/panel/notifications"
                icon={Bell}
                label="Bildirimler"
                isActive={pathname.startsWith("/panel/notifications")}
            />
            <NavItem
                href="/panel/settings"
                icon={Settings}
                label="Ayarlar"
                isActive={pathname.startsWith("/panel/settings")}
            />
            <button
                onClick={handleLogout}
                className="flex flex-col items-center justify-center flex-1 py-3 gap-1 text-slate-400 hover:text-red-500 transition-colors"
            >
                <LogOut size={24} />
                <span className="text-[10px] font-medium">Çıkış</span>
            </button>
        </div>
    );
}
