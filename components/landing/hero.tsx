"use client";

import { Button } from "@/components/ui/button";
import { MessageCircle, Instagram, Settings, Send, Paperclip, Smile } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export function HeroSection() {
    return (
        <section className="relative pt-20 pb-12 overflow-hidden bg-white">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] bg-orange-100/50 rounded-full blur-3xl opacity-60" />
                <div className="absolute top-[20%] -left-[10%] w-[600px] h-[600px] bg-blue-50/50 rounded-full blur-3xl opacity-60" />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="flex flex-col lg:flex-row items-center gap-16">
                    {/* Text Content */}
                    <div className="flex-1 text-center lg:text-left space-y-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 border border-orange-100 text-orange-600 text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-1000">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                            </span>
                            Yapay Zeka Destekli Müşteri Paneli
                        </div>

                        <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
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

                        <p className="text-xl text-slate-500 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                            Tüm mesajlarınız tek bir inbox’ta. Yapay Zeka Dijital Asistan'ın yanıtlasın; siz istediğiniz an tek tıkla devralın, sonra tekrar Yapay Zeka'ya devredin.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                            <Link href="#pricing">
                                <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-orange-600 hover:bg-orange-700 shadow-xl shadow-orange-500/20 transition-all hover:scale-105">
                                    Paketi Seç
                                </Button>
                            </Link>
                            <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-full border-2 hover:bg-slate-50 text-slate-600">
                                Demoyu İzle
                            </Button>
                        </div>

                        <div className="flex items-center gap-6 justify-center lg:justify-start text-sm text-slate-400 font-medium">
                            <span className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" /> Kredi Kartı Gerekmez
                            </span>
                            <span className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" /> 14 Gün Ücretsiz
                            </span>
                        </div>
                    </div>

                    {/* Visual Content (Mockup) */}
                    <div className="flex-1 relative w-full max-w-[600px] lg:max-w-none flex justify-center lg:justify-end">

                        {/* Floating Elements (Background) */}
                        <div className="absolute -left-4 lg:-left-12 bottom-48 lg:bottom-60 z-0">
                            <div className="animate-bounce duration-[3000ms]">
                                <div className="bg-white p-4 rounded-xl shadow-2xl border border-slate-100 rotate-[15deg]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                            <MessageCircle size={20} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-800">+128 Mesaj</div>
                                            <div className="text-xs text-green-600">WhatsApp Business</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="absolute -left-4 lg:-left-12 bottom-10 lg:bottom-20 z-0">
                            <div className="animate-bounce duration-[4000ms]">
                                <div className="bg-white p-4 rounded-xl shadow-2xl border border-slate-100 -rotate-[5deg]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600">
                                            <Instagram size={20} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-800">+24 DM</div>
                                            <div className="text-xs text-pink-500">Instagram</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Card (Foreground) */}
                        <div className="relative z-10 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform rotate-2 hover:rotate-0 transition-transform duration-700 ease-out max-w-lg w-full">
                            {/* Fake Browser Header */}
                            <div className="h-10 bg-slate-50 border-b border-slate-100 flex items-center px-4 gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-400" />
                                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                                <div className="w-3 h-3 rounded-full bg-green-400" />
                            </div>

                            {/* Mock UI Content */}
                            <div className="relative aspect-[4/3] bg-slate-50 p-4 flex gap-4">
                                {/* Sidebar */}
                                <div className="w-16 flex flex-col items-center justify-between gap-4 py-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center overflow-hidden">
                                            <img src="/uppy-logo-small.png" alt="Uppy" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 relative">
                                            <MessageCircle size={20} />
                                            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
                                                <span className="text-[10px] font-bold text-white">25</span>
                                            </div>
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center text-pink-600 relative">
                                            <Instagram size={20} />
                                            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
                                                <span className="text-[10px] font-bold text-white">46</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-400 cursor-pointer transition-colors">
                                        <Settings size={20} />
                                    </div>
                                </div>

                                {/* Chat Area */}
                                <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                                    <div className="h-14 border-b border-slate-100 flex items-center justify-between px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                                                <img src="/profile-woman.png" alt="User" className="w-full h-full object-cover" />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="h-2 w-24 bg-slate-200 rounded" />
                                                <div className="h-2 w-16 bg-slate-100 rounded" />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="px-3 py-1 bg-green-50 text-green-600 text-xs font-bold rounded-full border border-green-100 animate-pulse">
                                                AI Modu Aktif
                                            </div>
                                            <div className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full shadow-lg shadow-red-500/30 cursor-pointer hover:scale-105 transition-transform w-fit whitespace-nowrap">
                                                Konuşmayı Devral
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 bg-[#fffbeb] p-4 space-y-4 relative">
                                        {/* Messages */}
                                        <div className="flex flex-col gap-2">
                                            <div className="self-start bg-white p-3 rounded-2xl rounded-tl-none shadow-sm text-sm text-slate-600 max-w-[80%]">
                                                Fiyatlarınız hakkında bilgi alabilir miyim?
                                            </div>
                                            <div className="self-end bg-yellow-50 p-3 rounded-2xl rounded-tr-none shadow-sm text-sm text-slate-800 max-w-[80%] border border-yellow-100">
                                                <span className="text-[10px] text-orange-500 font-bold block mb-1">Dijital Asistan</span>
                                                Tabii ki! Paketlerimiz aylık 495 TL'den başlıyor. Detayları göndermemi ister misiniz? 😊
                                            </div>
                                        </div>

                                        {/* Toast Notification Simulation */}
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-4 py-2 rounded-full shadow-xl flex items-center gap-2 opacity-0 animate-in fade-in slide-in-from-bottom-2 delay-1000 fill-mode-forwards">
                                            <span>⚡</span> AI yanıtladı • 2sn önce
                                        </div>
                                    </div>

                                    {/* Input Area */}
                                    <div className="h-16 bg-white border-t border-slate-100 flex items-center px-4 gap-3">
                                        <div className="flex gap-2 text-slate-400">
                                            <Paperclip size={18} />
                                        </div>
                                        <div className="flex-1 bg-slate-50 h-10 rounded-full flex items-center px-4 text-xs text-slate-400">
                                            Mesajınızı yazın...
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                                            <Send size={18} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>



                    </div>
                </div>
            </div>
        </section>
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
