"use client";

import { motion, Variants } from "framer-motion";
import { ArrowRight, Check, Instagram, Globe, MessageCircle, Sparkles, TrendingUp, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const pulseAnimationConfig = {
    scale: [1, 1.05, 1],
    boxShadow: [
        "0 0 0 0 rgba(234, 88, 12, 0.4)",
        "0 0 0 12px rgba(234, 88, 12, 0)",
        "0 0 0 0 rgba(234, 88, 12, 0)"
    ]
};

const SOCIAL_LINKS = [
    {
        icon: Globe,
        label: "Web Sitemiz",
        href: "https://upgunai.com",
        color: "bg-slate-800 text-white",
        iconColor: "text-white"
    },
    {
        icon: MessageCircle,
        label: "WhatsApp İletişim",
        href: "https://wa.me/905334906252",
        color: "bg-emerald-500 text-white",
        iconColor: "text-white"
    },
    {
        icon: Instagram,
        label: "Instagram'da Takip Et",
        href: "https://instagram.com/upgunai", // GÜNCELLENEBİLİR
        color: "bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white",
        iconColor: "text-white"
    }
];

const PACKAGES = [
    {
        key: "base",
        name: "UppyPro Inbox",
        price: "995",
        features: ["Temel Mesaj Yönetimi", "Çoklu Kullanıcı Desteği", "Sohbet Geçmişi"],
        icon: MessageCircle,
        color: "text-slate-600",
        badge: null
    },
    {
        key: "ai_starter",
        name: "UppyPro AI",
        price: "3.995",
        features: ["Yapay Zeka Otomatizasyonu", "7/24 Kesintisiz Yanıt", "Mesaj Başına Sıfır Maliyet", "Sınırsız Şablon & Hazır Cevap"],
        icon: Sparkles,
        color: "text-orange-600",
        badge: "🎁 7 Gün Ücretsiz",
        highlighted: true
    },
    {
        key: "ai_trendyol",
        name: "AI Trendyol",
        price: "4.995",
        features: ["Tüm AI Özellikleri", "Trendyol Pazaryeri Entegrasyonu", "Özel Satış Senaryoları", "Sipariş & Kargo Yanıtları"],
        icon: Zap,
        color: "text-indigo-600",
        badge: "E-Ticaret İçin"
    }
];

export default function PresentationLandingPage() {
    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans pb-28 flex flex-col items-center relative overflow-hidden">
            {/* Background Glows */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[30%] bg-orange-200/40 blur-[100px] rounded-full"></div>
                <div className="absolute top-[40%] right-[-10%] w-[50%] h-[40%] bg-blue-200/40 blur-[100px] rounded-full"></div>
            </div>

            <motion.div
                className="w-full max-w-md px-5 mt-8 mb-6 flex flex-col items-center"
                initial="hidden"
                animate="show"
                variants={containerVariants}
            >
                {/* 1. Header & Logo */}
                <motion.div variants={itemVariants} className="mb-8 flex flex-col items-center">
                    <Link href="/" className="block">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 hover:shadow-md transition-shadow cursor-pointer">
                            <Image
                                src="/brand-logo-text.png"
                                alt="UppyPro Logo"
                                width={160}
                                height={40}
                                className="h-8 w-auto mix-blend-multiply"
                                priority
                            />
                        </div>
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-center text-slate-900 leading-tight mb-3">
                        İşletmenizi Yapay Zeka ile Büyütmeye Başlayın
                    </h1>
                    <p className="text-center text-slate-500 text-[15px] max-w-[280px]">
                        Müşteri iletişiminizi otopilota bağlayın ve satışlarınızı anında artırın!
                    </p>
                </motion.div>

                {/* 2. Highlight CTA - Free Trial */}
                <motion.div variants={itemVariants} className="w-full mb-8">
                    <motion.div
                        animate={{
                            boxShadow: ["0 0 0 0 rgba(234, 88, 12, 0.4)", "0 0 0 10px rgba(234, 88, 12, 0)"],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white text-center shadow-lg relative overflow-hidden"
                    >
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 animate-[shimmer_3s_infinite_linear] w-[150%] h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg] z-10 pointer-events-none"></div>

                        <div className="flex justify-center mb-3">
                            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                                Özel Fırsat
                            </span>
                        </div>
                        <h2 className="text-xl font-bold mb-2">🎁 7 Gün Ücretsiz Deneme</h2>
                        <p className="text-sm text-white/90 mb-5 text-balance">
                            AI Asistanın gücünü deneyimleyin. Kolay kurulum sihirbazlarıyla <b className="font-semibold text-white">5 dakikada</b> AI Asistanınızı aktif hale getirin.
                        </p>
                        <Link href="/#pricing" className="block w-full">
                            <Button className="w-full bg-white text-orange-600 hover:bg-slate-50 font-bold h-12 text-sm rounded-xl shadow-sm z-20 relative transition-transform active:scale-95">
                                Ücretsiz Denemeyi Başlat
                                <ArrowRight className="w-4 h-4 ml-1.5" />
                            </Button>
                        </Link>
                    </motion.div>
                </motion.div>

                {/* 3. Link-in-Bio Quick Links */}
                <motion.div variants={itemVariants} className="w-full flex gap-3 mb-10 overflow-x-auto pb-2 snap-x hide-scrollbar">
                    {SOCIAL_LINKS.map((link, idx) => {
                        const Icon = link.icon;
                        return (
                            <Link href={link.href} key={idx} className="flex-1 min-w-[100px] snap-center">
                                <motion.div
                                    whileTap={{ scale: 0.95 }}
                                    className={`flex flex-col items-center justify-center p-3 h-[90px] rounded-2xl ${link.color} shadow-sm border border-slate-100 transition-shadow hover:shadow-md cursor-pointer relative overflow-hidden`}
                                >
                                    <span className="card-sparkle sparkle-1" />
                                    <span className="card-sparkle sparkle-2" />
                                    <span className="card-sparkle sparkle-3" />
                                    <span className="card-sparkle sparkle-4" />
                                    <span className="card-sparkle sparkle-5" />
                                    <Icon className={`w-6 h-6 mb-2 ${link.iconColor}`} />
                                    <span className="text-[11px] font-semibold text-center leading-tight">
                                        {link.label}
                                    </span>
                                </motion.div>
                            </Link>
                        );
                    })}
                </motion.div>

                {/* 4. Packages / Pricing */}
                <motion.div variants={itemVariants} className="w-full flex flex-col items-center mb-10 mt-4">
                    <Image
                        src="/uppypro_logo_avatar.png"
                        alt="UppyPro"
                        width={180}
                        height={60}
                        className="mb-5 object-contain"
                    />
                    <Link href="/#features" className="w-full">
                        <Button className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold h-12 rounded-xl transition-colors">
                            Tüm Özellikleri İncele
                        </Button>
                    </Link>
                </motion.div>

                <motion.div variants={itemVariants} className="w-full space-y-6">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-slate-400" />
                        <h3 className="font-bold text-slate-800 text-lg">Öne Çıkan Paketler</h3>
                    </div>

                    <div className="space-y-4">
                        {PACKAGES.map((pkg) => {
                            const Icon = pkg.icon;
                            return (
                                <Link href={`/uyelik?plan=${pkg.key}`} key={pkg.key} className="block">
                                    <motion.div
                                        whileTap={{ scale: 0.98 }}
                                        className={`w-full bg-white rounded-2xl border-2 p-5 transition-all
                                        ${pkg.highlighted ? 'border-orange-500 shadow-md ring-4 ring-orange-500/10' : 'border-slate-100 shadow-sm'}`}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-2 rounded-lg ${pkg.highlighted ? 'bg-orange-100' : 'bg-slate-100'}`}>
                                                    <Icon className={`w-5 h-5 ${pkg.color}`} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900">{pkg.name}</h4>
                                                    {pkg.badge && (
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${pkg.highlighted ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                            {pkg.badge}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-extrabold text-[#0f172a] text-xl">{pkg.price} <span className="text-sm font-medium">TL</span></div>
                                                <div className="text-[10px] text-slate-400 font-medium tracking-wide">+ KDV / ay</div>
                                            </div>
                                        </div>

                                        <ul className="space-y-1.5 mt-4">
                                            {pkg.features.map((feature, i) => (
                                                <li key={i} className="flex items-start gap-2 text-[13px] text-slate-600">
                                                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                                    <span className="leading-tight">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </motion.div>
                                </Link>
                            );
                        })}
                    </div>
                </motion.div>
            </motion.div>

            {/* Sticky Bottom Bar */}
            <motion.div
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.5 }}
                className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-md p-4 border-t border-slate-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-50 flex justify-center"
            >
                <div className="w-full max-w-md">
                    <Link href="/#pricing" className="block">
                        <Button className="w-full h-14 bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold rounded-xl text-base shadow-lg transition-transform active:scale-95 relative overflow-hidden">
                            <span className="card-sparkle sparkle-1" />
                            <span className="card-sparkle sparkle-2" />
                            <span className="card-sparkle sparkle-3" />
                            <span className="card-sparkle sparkle-4" />
                            <span className="card-sparkle sparkle-5" />
                            <span className="relative z-10 flex items-center">
                                Hemen Kaydol & Başla
                                <Sparkles className="w-4 h-4 ml-2 text-orange-400" />
                            </span>
                        </Button>
                    </Link>
                </div>
            </motion.div>

            <style jsx global>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                @keyframes shimmer {
                    0% {
                        transform: translateX(-150%);
                    }
                    100% {
                        transform: translateX(100%);
                    }
                }
            `}</style>
        </div>
    );
}
