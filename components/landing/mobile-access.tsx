"use client";

import { motion } from "framer-motion";
import { Smartphone, Monitor, Tablet, Wifi, WifiOff } from "lucide-react";

export function MobileAccessSection() {
    return (
        <section className="relative py-16 md:py-28 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Background decorations */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-3xl" />
                {/* Dot grid pattern */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                    backgroundSize: '32px 32px'
                }} />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                    {/* Left Content */}
                    <motion.div
                        initial={{ opacity: 0, x: -40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        viewport={{ once: true, margin: "-100px" }}
                        className="space-y-8"
                    >
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full">
                            <Smartphone className="w-4 h-4 text-orange-400" />
                            <span className="text-orange-400 text-sm font-semibold tracking-wide">MOBİL UYUMLU</span>
                        </div>

                        {/* Heading */}
                        <div className="space-y-4">
                            <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">
                                Her Yerden,{" "}
                                <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                                    Her Cihazdan
                                </span>{" "}
                                Erişin
                            </h2>
                            <p className="text-slate-400 text-base md:text-lg leading-relaxed max-w-lg">
                                UppyPro paneli tamamen mobil uyumludur. İster bilgisayarınızdan, ister tabletinizden,
                                ister cebinizdeki telefondan — nerede olursanız olun müşterilerinize anında ulaşın.
                            </p>
                        </div>

                        {/* Feature points */}
                        <div className="space-y-4">
                            {[
                                {
                                    icon: <Smartphone className="w-5 h-5" />,
                                    title: "Telefonunuzdan Yönetin",
                                    desc: "Yolda, dışarıda veya evde — paneliniz cebinizde."
                                },
                                {
                                    icon: <WifiOff className="w-5 h-5" />,
                                    title: "Uygulama İndirmenize Gerek Yok",
                                    desc: "Tarayıcınızdan anında erişin. Kurulum ve güncelleme derdi yok."
                                },
                                {
                                    icon: <Wifi className="w-5 h-5" />,
                                    title: "Anlık Bildirimler",
                                    desc: "Yeni mesajları anında görün, müşterilerinizi bekletmeyin."
                                }
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: 0.1 * (i + 1) }}
                                    viewport={{ once: true }}
                                    className="flex items-start gap-4 group"
                                >
                                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 group-hover:bg-orange-500/20 transition-colors">
                                        {item.icon}
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold text-sm md:text-base">{item.title}</h4>
                                        <p className="text-slate-500 text-xs md:text-sm mt-0.5">{item.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Device badges */}
                        <div className="flex items-center gap-3 pt-2">
                            {[
                                { icon: <Smartphone className="w-4 h-4" />, label: "iPhone & Android" },
                                { icon: <Tablet className="w-4 h-4" />, label: "Tablet" },
                                { icon: <Monitor className="w-4 h-4" />, label: "Bilgisayar" },
                            ].map((device, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-slate-400 text-xs font-medium"
                                >
                                    {device.icon}
                                    <span>{device.label}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Right — Phone Mockup */}
                    <motion.div
                        initial={{ opacity: 0, y: 60 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
                        viewport={{ once: true, margin: "-100px" }}
                        className="flex justify-center lg:justify-end"
                    >
                        <div className="relative">
                            {/* Glow effect behind phone */}
                            <div className="absolute -inset-8 bg-gradient-to-tr from-orange-500/20 via-transparent to-amber-500/10 rounded-[60px] blur-2xl" />

                            {/* Phone frame */}
                            <div className="relative w-[280px] md:w-[320px] bg-slate-800 rounded-[3rem] p-3 shadow-2xl shadow-black/50 border border-slate-700/50">
                                {/* Notch */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-800 rounded-b-2xl z-20" />

                                {/* Screen */}
                                <div className="rounded-[2.3rem] overflow-hidden bg-white relative">
                                    <img
                                        src="/features/mobile-screenshot.png"
                                        alt="UppyPro Mobil Panel Görünümü"
                                        className="w-full h-auto block"
                                    />
                                </div>

                                {/* Home indicator */}
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 bg-slate-600 rounded-full" />
                            </div>

                            {/* Floating badges */}
                            <motion.div
                                animate={{ y: [0, -8, 0] }}
                                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                className="absolute -top-4 -right-4 md:-right-8 bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg shadow-green-500/30 flex items-center gap-1.5"
                            >
                                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                Online
                            </motion.div>

                            <motion.div
                                animate={{ y: [0, 6, 0] }}
                                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut", delay: 0.5 }}
                                className="absolute -bottom-3 -left-4 md:-left-8 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg shadow-orange-500/30"
                            >
                                📱 Her Yerde Erişim
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
