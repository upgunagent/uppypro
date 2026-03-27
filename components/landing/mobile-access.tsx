"use client";

import { motion } from "framer-motion";
import { Smartphone, Monitor, Tablet, WifiOff } from "lucide-react";

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
                <div className="grid grid-cols-2 gap-4 md:gap-12 lg:gap-20 items-center">
                    {/* Left Content */}
                    <motion.div
                        initial={{ opacity: 0, x: -40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        viewport={{ once: true, margin: "-100px" }}
                        className="space-y-3 md:space-y-8"
                    >
                        {/* Badge */}
                        <div className="inline-flex items-center gap-1.5 md:gap-2 px-2 md:px-4 py-1 md:py-2 bg-orange-500/10 border border-orange-500/20 rounded-full">
                            <Smartphone className="w-3 h-3 md:w-4 md:h-4 text-orange-400" />
                            <span className="text-orange-400 text-[8px] md:text-sm font-semibold tracking-wide">MOBİL UYUMLU</span>
                        </div>

                        {/* Heading */}
                        <div className="space-y-2 md:space-y-4">
                            <h2 className="text-lg md:text-5xl font-extrabold text-white leading-tight">
                                Her Yerden,{" "}
                                <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                                    Her Cihazdan
                                </span>{" "}
                                Erişin
                            </h2>
                            <p className="text-slate-400 text-[10px] md:text-lg leading-relaxed max-w-lg">
                                UppyPro paneli tamamen mobil uyumludur. Nerede olursanız olun müşterilerinize anında ulaşın.
                            </p>
                        </div>

                        {/* Feature points */}
                        <div className="space-y-2 md:space-y-4">
                            {[
                                {
                                    icon: <Smartphone className="w-3.5 h-3.5 md:w-5 md:h-5" />,
                                    title: "Telefonunuzdan Yönetin",
                                    desc: "Paneliniz cebinizde."
                                },
                                {
                                    icon: <WifiOff className="w-3.5 h-3.5 md:w-5 md:h-5" />,
                                    title: "Uygulama Gerekmez",
                                    desc: "Tarayıcınızdan anında erişin."
                                },
                                {
                                    icon: <Monitor className="w-3.5 h-3.5 md:w-5 md:h-5" />,
                                    title: "Her Ekranda Aynı",
                                    desc: "Masaüstü, tablet, telefon — aynı panel."
                                }
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: 0.1 * (i + 1) }}
                                    viewport={{ once: true }}
                                    className="flex items-start gap-2 md:gap-4 group"
                                >
                                    <div className="flex-shrink-0 w-7 h-7 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 group-hover:bg-orange-500/20 transition-colors">
                                        {item.icon}
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold text-[10px] md:text-base">{item.title}</h4>
                                        <p className="text-slate-500 text-[8px] md:text-sm mt-0.5">{item.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Device badges */}
                        <div className="flex items-center gap-1.5 md:gap-3 pt-1 md:pt-2 flex-wrap">
                            {[
                                { icon: <Smartphone className="w-3 h-3 md:w-4 md:h-4" />, label: "iPhone & Android" },
                                { icon: <Tablet className="w-3 h-3 md:w-4 md:h-4" />, label: "Tablet" },
                                { icon: <Monitor className="w-3 h-3 md:w-4 md:h-4" />, label: "PC" },
                            ].map((device, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-1 px-1.5 md:px-3 py-0.5 md:py-1.5 bg-white/5 border border-white/10 rounded-full text-slate-400 text-[7px] md:text-xs font-medium"
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
                            <div className="absolute -inset-4 md:-inset-8 bg-gradient-to-tr from-orange-500/20 via-transparent to-amber-500/10 rounded-[40px] md:rounded-[60px] blur-2xl" />

                            {/* Phone frame */}
                            <div className="relative w-[140px] md:w-[320px] bg-slate-800 rounded-[1.5rem] md:rounded-[3rem] p-1.5 md:p-3 shadow-2xl shadow-black/50 border border-slate-700/50">
                                {/* Notch */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-14 md:w-28 h-3 md:h-6 bg-slate-800 rounded-b-xl md:rounded-b-2xl z-20" />

                                {/* Screen */}
                                <div className="rounded-[1.2rem] md:rounded-[2.3rem] overflow-hidden bg-white relative">
                                    <img
                                        src="/features/mobile-screenshot.png"
                                        alt="UppyPro Mobil Panel Görünümü"
                                        className="w-full h-auto block"
                                    />
                                </div>

                                {/* Home indicator */}
                                <div className="absolute bottom-1 md:bottom-2 left-1/2 -translate-x-1/2 w-14 md:w-28 h-0.5 md:h-1 bg-slate-600 rounded-full" />
                            </div>

                            {/* Floating badges */}
                            <motion.div
                                animate={{ y: [0, -8, 0] }}
                                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                className="absolute -top-2 md:-top-4 -right-1 md:-right-8 bg-green-500 text-white px-1.5 md:px-3 py-0.5 md:py-1.5 rounded-full text-[7px] md:text-xs font-bold shadow-lg shadow-green-500/30 flex items-center gap-1"
                            >
                                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full animate-pulse" />
                                Online
                            </motion.div>

                            <motion.div
                                animate={{ y: [0, 6, 0] }}
                                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut", delay: 0.5 }}
                                className="absolute -bottom-2 md:-bottom-3 -left-1 md:-left-8 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-1.5 md:px-3 py-0.5 md:py-1.5 rounded-full text-[7px] md:text-xs font-bold shadow-lg shadow-orange-500/30"
                            >
                                📱 Her Yerde
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
