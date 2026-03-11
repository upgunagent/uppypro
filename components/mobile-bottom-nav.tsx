"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Calendar, Users, Settings, LogOut, MessageSquare, Bell, MoreHorizontal, HelpCircle, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

export function MobileBottomNav() {
    const pathname = usePathname();
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleLogout = async () => {
        setIsMenuOpen(false);
        const supabase = createClient();
        await supabase.auth.signOut();
        router.refresh();
        router.push("/login");
    };

    // Dışarıya tıklayınca menüyü kapat
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        if (isMenuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            document.addEventListener("touchstart", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, [isMenuOpen]);

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

            {/* Daha Fazla Menü Butonu */}
            <div className="relative flex-1" ref={menuRef}>
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={clsx(
                        "flex flex-col items-center justify-center w-full py-3 gap-1 transition-colors",
                        isMenuOpen ? "text-orange-600" : "text-slate-500 hover:text-slate-900"
                    )}
                >
                    {isMenuOpen ? <X size={24} strokeWidth={2} /> : <MoreHorizontal size={24} strokeWidth={2} />}
                    <span className="text-[10px] font-medium">Diğer</span>
                </button>

                {/* Yukarı Açılan Popup Menü */}
                {isMenuOpen && (
                    <>
                        {/* Arka plan overlay */}
                        <div className="fixed inset-0 bg-black/20 z-40" style={{ bottom: '60px' }} />

                        {/* Menü içeriği */}
                        <div
                            className="absolute bottom-[calc(100%+8px)] right-0 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in slide-in-from-bottom-2 fade-in duration-200"
                        >
                            <Link
                                href="/panel/help"
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center gap-3 px-4 py-3.5 text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors active:bg-orange-100"
                            >
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-400 to-amber-500 flex items-center justify-center shadow-sm">
                                    <HelpCircle size={20} className="text-white" strokeWidth={2.5} />
                                </div>
                                <span className="font-semibold text-sm">Yardım & Destek</span>
                            </Link>

                            <div className="h-px bg-slate-100 mx-3" />

                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 px-4 py-3.5 w-full text-slate-700 hover:bg-red-50 hover:text-red-600 transition-colors active:bg-red-100"
                            >
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-400 to-rose-500 flex items-center justify-center shadow-sm">
                                    <LogOut size={20} className="text-white" strokeWidth={2.5} />
                                </div>
                                <span className="font-semibold text-sm">Çıkış Yap</span>
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
