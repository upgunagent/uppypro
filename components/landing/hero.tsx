"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Instagram, Settings, Send, Paperclip, ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";


export function HeroSection() {


    return (
        <>
            <section className="relative pt-8 md:pt-20 pb-12 overflow-hidden bg-white">
                {/* Background Decorations */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[20%] -left-[10%] w-[600px] h-[600px] bg-blue-50/50 rounded-full blur-3xl opacity-60" />
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        {/* Text Content */}
                        <div className="flex-1 text-center lg:text-left space-y-4 md:space-y-8">
                            {/* Mobile: Sync Animation + Login Button */}
                            <div className="md:hidden flex flex-col items-center gap-2">
                                <SyncAnimationBadge />
                                <Link href="/login" className="w-full max-w-[200px]">
                                    <Button className="bg-[#25D366] hover:bg-[#128C7E] text-white shadow-md rounded-full px-6 py-3 text-sm font-bold transition-colors w-full">
                                        İşletme Girişi
                                    </Button>
                                </Link>
                            </div>

                            <h1 className="text-[2.5rem] sm:text-5xl lg:text-6xl xl:text-[4rem] font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                                Instagram + WhatsApp <br />
                                <span className="relative inline-block">
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">
                                        Tek Panelde.
                                    </span>
                                    <span className="absolute inset-0 text-transparent bg-clip-text bg-[linear-gradient(90deg,transparent_45%,rgba(255,255,255,0.8)_50%,transparent_55%)] bg-[length:200%_auto] bg-no-repeat animate-shine pointer-events-none" aria-hidden="true">
                                        Tek Panelde.
                                    </span>
                                </span>
                            </h1>

                            <p className="text-lg lg:text-xl text-slate-500 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                                Tüm mesajlarınız tek bir inbox’ta. Yapay Zeka Dijital Asistan'ın yanıtlasın; siz istediğiniz an tek tıkla devralın, sonra tekrar Yapay Zeka'ya devredin.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                                <Link href="#pricing">
                                    <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-orange-600 hover:bg-orange-700 shadow-xl shadow-orange-500/20 transition-all hover:scale-105">
                                        Paketi Seç
                                    </Button>
                                </Link>
                                <Link href="/#pricing">
                                    <Button
                                        size="lg"
                                        className="h-14 px-8 text-lg rounded-full bg-[#25D366] hover:bg-[#128C7E] text-white shadow-lg transition-colors"
                                    >
                                        7 Gün Ücretsiz Başla
                                    </Button>
                                </Link>
                            </div>

                            <div className="flex items-center gap-6 justify-center lg:justify-start text-sm text-slate-400 font-medium">
                                <span className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" /> 7 Gün Ücretsiz Deneme
                                </span>
                                <span className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" /> Taahhüt Yok
                                </span>
                            </div>
                        </div>

                        {/* Visual Content (Mockup) */}
                        <div className="flex-1 relative w-full max-w-[600px] lg:max-w-none flex flex-col items-center lg:items-end">
                            <div className="hidden md:block">
                                <SyncAnimationBadge />
                            </div>

                            <div className="relative w-full flex justify-center lg:justify-end">
                                {/* Floating Elements (Background) */}
                                {/* Floating Elements (Background) */}
                                <div className="absolute left-0 md:-left-4 lg:-left-24 xl:-left-32 bottom-[55%] md:bottom-48 lg:bottom-60 z-20">
                                    <div className="animate-bounce duration-[3000ms]">
                                        <div className="bg-white p-2 md:p-4 rounded-lg md:rounded-xl shadow-2xl border border-slate-100 rotate-[15deg]">
                                            <div className="flex items-center gap-1.5 md:gap-3">
                                                <div className="w-6 h-6 md:w-10 md:h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                                    <MessageCircle size={12} className="md:hidden" />
                                                    <MessageCircle size={20} className="hidden md:block" />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] md:text-sm font-bold text-slate-800">+128</div>
                                                    <div className="text-[8px] md:text-xs text-green-600">WhatsApp</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute left-0 md:-left-4 lg:-left-20 xl:-left-28 bottom-[15%] md:bottom-10 lg:bottom-20 z-20">
                                    <div className="animate-bounce duration-[4000ms]">
                                        <div className="bg-white p-2 md:p-4 rounded-lg md:rounded-xl shadow-2xl border border-slate-100 -rotate-[5deg]">
                                            <div className="flex items-center gap-1.5 md:gap-3">
                                                <div className="w-6 h-6 md:w-10 md:h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600">
                                                    <Instagram size={12} className="md:hidden" />
                                                    <Instagram size={20} className="hidden md:block" />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] md:text-sm font-bold text-slate-800">+24</div>
                                                    <div className="text-[8px] md:text-xs text-pink-500">Instagram</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Main Card (Foreground) */}
                                <div className="relative z-10 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform rotate-2 hover:rotate-0 transition-transform duration-700 ease-out max-w-[300px] md:max-w-lg w-full ml-auto mr-0 md:mr-0">
                                    {/* Fake Browser Header */}
                                    <div className="h-7 md:h-10 bg-slate-50 border-b border-slate-100 flex items-center px-2 md:px-4 gap-1.5 md:gap-2">
                                        <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-red-400" />
                                        <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-yellow-400" />
                                        <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-green-400" />
                                    </div>

                                    {/* Mock UI Content */}
                                    <div className="relative aspect-[4/3] bg-slate-50 p-2 md:p-4 flex gap-2 md:gap-4">
                                        {/* Sidebar */}
                                        <div className="w-10 md:w-16 flex flex-col items-center justify-between gap-2 md:gap-4 py-2 md:py-4 bg-white rounded-lg md:rounded-xl shadow-sm border border-slate-100">
                                            <div className="flex flex-col items-center gap-2 md:gap-4">
                                                <div className="w-7 h-7 md:w-10 md:h-10 rounded-full bg-orange-50 flex items-center justify-center overflow-hidden">
                                                    <img src="/uppy-logo-small.png" alt="Uppy" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="w-7 h-7 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-green-50 flex items-center justify-center text-green-600 relative">
                                                    <MessageCircle size={14} className="md:hidden" />
                                                    <MessageCircle size={20} className="hidden md:block" />
                                                    <div className="absolute -top-1 -right-1 md:-top-1.5 md:-right-1.5 w-3.5 h-3.5 md:w-5 md:h-5 bg-red-500 rounded-full flex items-center justify-center border-[1.5px] md:border-2 border-white">
                                                        <span className="text-[7px] md:text-[10px] font-bold text-white">25</span>
                                                    </div>
                                                </div>
                                                <div className="w-7 h-7 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-pink-50 flex items-center justify-center text-pink-600 relative">
                                                    <Instagram size={14} className="md:hidden" />
                                                    <Instagram size={20} className="hidden md:block" />
                                                    <div className="absolute -top-1 -right-1 md:-top-1.5 md:-right-1.5 w-3.5 h-3.5 md:w-5 md:h-5 bg-red-500 rounded-full flex items-center justify-center border-[1.5px] md:border-2 border-white">
                                                        <span className="text-[7px] md:text-[10px] font-bold text-white">46</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="w-7 h-7 md:w-10 md:h-10 rounded-lg md:rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-400 cursor-pointer transition-colors">
                                                <Settings size={14} className="md:hidden" />
                                                <Settings size={20} className="hidden md:block" />
                                            </div>
                                        </div>

                                        {/* Chat Area */}
                                        <div className="flex-1 bg-white rounded-lg md:rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                                            <div className="h-8 md:h-14 border-b border-slate-100 flex items-center justify-between px-2 md:px-4">
                                                <div className="flex items-center gap-1.5 md:gap-3">
                                                    <div className="w-5 h-5 md:w-8 md:h-8 rounded-full bg-slate-200 overflow-hidden">
                                                        <img src="/profile-woman.png" alt="User" className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="space-y-0.5 md:space-y-1">
                                                        <div className="h-1.5 md:h-2 w-12 md:w-24 bg-slate-200 rounded" />
                                                        <div className="h-1.5 md:h-2 w-8 md:w-16 bg-slate-100 rounded" />
                                                    </div>
                                                </div>
                                                <div className="hidden md:flex items-center gap-2">
                                                    <div className="px-3 py-1 bg-green-50 text-green-600 text-xs font-bold rounded-full border border-green-100 animate-pulse">
                                                        AI Modu Aktif
                                                    </div>
                                                    <div className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full shadow-lg shadow-red-500/30 cursor-pointer hover:scale-105 transition-transform w-fit whitespace-nowrap">
                                                        Konuşmayı Devral
                                                    </div>
                                                </div>
                                                <div className="flex md:hidden items-center">
                                                    <div className="px-1.5 py-0.5 bg-green-50 text-green-600 text-[7px] font-bold rounded-full border border-green-100 animate-pulse">
                                                        AI Aktif
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex-1 bg-[#fffbeb] p-2 md:p-4 space-y-2 md:space-y-4 relative">
                                                {/* Messages */}
                                                <div className="flex flex-col gap-1.5 md:gap-2">
                                                    <div className="self-start bg-white p-1.5 md:p-3 rounded-xl md:rounded-2xl rounded-tl-none shadow-sm text-[9px] md:text-sm text-slate-600 max-w-[85%]">
                                                        Fiyat bilgisi alabilir miyim?
                                                    </div>
                                                    <div className="self-end bg-yellow-50 p-1.5 md:p-3 rounded-xl md:rounded-2xl rounded-tr-none shadow-sm text-[9px] md:text-sm text-slate-800 max-w-[85%] border border-yellow-100">
                                                        <span className="text-[7px] md:text-[10px] text-orange-500 font-bold block mb-0.5">AI Asistan</span>
                                                        Paketler 495 TL'den başlıyor 😊
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Input Area */}
                                            <div className="h-8 md:h-16 bg-white border-t border-slate-100 flex items-center px-2 md:px-4 gap-1.5 md:gap-3">
                                                <div className="flex gap-1 md:gap-2 text-slate-400">
                                                    <Paperclip size={12} className="md:hidden" />
                                                    <Paperclip size={18} className="hidden md:block" />
                                                </div>
                                                <div className="flex-1 bg-slate-50 h-5 md:h-10 rounded-full flex items-center px-2 md:px-4 text-[7px] md:text-xs text-slate-400">
                                                    Mesaj yazın...
                                                </div>
                                                <div className="w-5 h-5 md:w-10 md:h-10 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                                                    <Send size={10} className="md:hidden" />
                                                    <Send size={18} className="hidden md:block" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>



                            </div>
                            {/* end inner wrapper */}
                        </div>
                        {/* end right column */}
                    </div>
                    {/* end flex row */}
                </div>
                {/* end container */}
            </section>

        </>
    );
}

function CheckCircle({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    )
}

function SyncAnimationBadge() {
    const [activeIcon, setActiveIcon] = useState<"whatsapp" | "instagram">("whatsapp");

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveIcon((prev) => (prev === "whatsapp" ? "instagram" : "whatsapp"));
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-center gap-6 mb-8 w-fit mx-auto lg:mx-0">
            {/* UU Logo */}
            <div className="h-12 flex items-center justify-center">
                <img src="/uu-sync-logo.png" alt="UppyPro" className="h-[38px] w-auto object-contain" />
            </div>

            {/* Sync Arrows */}
            <div className="relative w-14 h-10 flex items-center justify-center">
                <img src="/animasyon.gif" alt="Sync Loop" className="w-full h-full object-contain" />
            </div>

            {/* Social Media Logos */}
            <div className="w-14 h-14 relative flex items-center justify-center">
                <AnimatePresence mode="wait">
                    {activeIcon === "whatsapp" ? (
                        <motion.div
                            key="wa"
                            initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.5, rotate: 45 }}
                            transition={{ duration: 0.4, ease: "backOut" }}
                            className="absolute"
                        >
                            <img src="/whatsapp_ikon.png" alt="WhatsApp" className="w-8 h-8 rounded-lg object-contain" />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="ig"
                            initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.5, rotate: 45 }}
                            transition={{ duration: 0.4, ease: "backOut" }}
                            className="absolute"
                        >
                            <img src="/instagram_ikon.png" alt="Instagram" className="w-8 h-8 rounded-lg object-contain" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
