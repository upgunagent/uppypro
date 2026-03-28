"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Sparkles, ArrowRight, ArrowLeft, Loader2, RotateCcw,
    Scissors, Heart, Stethoscope, UtensilsCrossed, 
    Dog, Dumbbell, Home, ShoppingCart, GraduationCap, Wrench,
    User, Users, Building2, Building,
    MessageCircleWarning, CalendarX, UserX, Moon, Globe, LayoutGrid, MessagesSquare, Bot,
    CheckCircle2, ChevronRight, Gift
} from "lucide-react";
import ReactMarkdown from "react-markdown";

// ==================== DATA ====================

const SECTORS = [
    { id: "beauty", label: "Güzellik & Kuaför", icon: Scissors, emoji: "💇" },
    { id: "spa", label: "SPA & Masaj", icon: Heart, emoji: "💆" },
    { id: "clinic", label: "Klinik & Sağlık", icon: Stethoscope, emoji: "🏥" },
    { id: "restaurant", label: "Restoran & Kafe", icon: UtensilsCrossed, emoji: "🍽️" },
    { id: "pet", label: "Veteriner & Pet", icon: Dog, emoji: "🐾" },
    { id: "fitness", label: "Spor & Fitness", icon: Dumbbell, emoji: "🏋️" },
    { id: "realestate", label: "Emlak", icon: Home, emoji: "🏠" },
    { id: "ecommerce", label: "E-Ticaret", icon: ShoppingCart, emoji: "🛒" },
    { id: "education", label: "Eğitim & Kurs", icon: GraduationCap, emoji: "📚" },
    { id: "other", label: "Diğer", icon: Wrench, emoji: "🔧" },
];

const TEAM_SIZES = [
    { id: "solo", label: "Sadece ben", sublabel: "1 kişi", icon: User },
    { id: "small", label: "2-5 kişi", sublabel: "Küçük ekip", icon: Users },
    { id: "medium", label: "6-15 kişi", sublabel: "Orta ekip", icon: Building2 },
    { id: "large", label: "15+ kişi", sublabel: "Büyük ekip", icon: Building },
];

const PROBLEMS = [
    { id: "slow_response", label: "Mesajlara geç dönüş yapıyoruz", icon: MessageCircleWarning },
    { id: "calendar", label: "Randevu/takvim yönetimi karmaşık", icon: CalendarX },
    { id: "no_crm", label: "Müşteri bilgilerini takip edemiyoruz", icon: UserX },
    { id: "after_hours", label: "Mesai dışı mesajlara cevap veremiyoruz", icon: Moon },
    { id: "language", label: "Yabancı müşterilerle iletişim zorluğu", icon: Globe },
    { id: "multi_channel", label: "Birden fazla kanalı yönetmek zor", icon: LayoutGrid },
    { id: "team_chaos", label: "Ekip içi mesaj karmaşası var", icon: MessagesSquare },
    { id: "need_automation", label: "Otomasyona ihtiyacımız var", icon: Bot },
];

// ==================== COMPONENT ====================

export function PackageFinderSection() {
    const [step, setStep] = useState(0); // 0=intro, 1=sector, 2=team, 3=problems, 4=extra, 5=result
    const [sector, setSector] = useState("");
    const [sectorOther, setSectorOther] = useState("");
    const [teamSize, setTeamSize] = useState("");
    const [selectedProblems, setSelectedProblems] = useState<string[]>([]);
    const [extraInfo, setExtraInfo] = useState("");
    const [loading, setLoading] = useState(false);
    const [recommendation, setRecommendation] = useState("");
    const [recommendedPackage, setRecommendedPackage] = useState("");
    const [error, setError] = useState("");
    const [displayedText, setDisplayedText] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const resultRef = useRef<HTMLDivElement>(null);
    const sectionRef = useRef<HTMLElement>(null);

    // Typewriter effect
    useEffect(() => {
        if (!recommendation) return;
        setIsTyping(true);
        setDisplayedText("");
        let i = 0;
        const interval = setInterval(() => {
            i++;
            setDisplayedText(recommendation.slice(0, i));
            if (i >= recommendation.length) {
                clearInterval(interval);
                setIsTyping(false);
            }
        }, 12);
        return () => clearInterval(interval);
    }, [recommendation]);

    // Auto-scroll to result
    useEffect(() => {
        if (step === 5 && resultRef.current) {
            setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
        }
    }, [step]);

    const getSectorLabel = () => {
        if (sector === "other") return sectorOther || "Diğer";
        return SECTORS.find(s => s.id === sector)?.label || sector;
    };

    const getTeamLabel = () => TEAM_SIZES.find(t => t.id === teamSize)?.label || teamSize;

    const getProblemLabels = () => selectedProblems.map(p => PROBLEMS.find(pr => pr.id === p)?.label || p);

    const canProceed = () => {
        if (step === 1) return sector !== "" && (sector !== "other" || sectorOther.trim() !== "");
        if (step === 2) return teamSize !== "";
        if (step === 3) return selectedProblems.length > 0;
        return true;
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError("");
        setStep(5);

        try {
            const res = await fetch("/api/package-recommendation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sector: getSectorLabel(),
                    teamSize: getTeamLabel(),
                    problems: getProblemLabels(),
                    extraInfo: extraInfo.trim() || undefined,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setRecommendation(data.recommendation);
            setRecommendedPackage(data.recommendedPackage);
        } catch (err: any) {
            setError(err.message || "Bir hata oluştu");
            setStep(4);
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setStep(0);
        setSector("");
        setSectorOther("");
        setTeamSize("");
        setSelectedProblems([]);
        setExtraInfo("");
        setRecommendation("");
        setRecommendedPackage("");
        setError("");
        setDisplayedText("");
    };

    const toggleProblem = (id: string) => {
        setSelectedProblems(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    // Step progress
    const totalSteps = 4;
    const currentProgress = Math.min(step, totalSteps);

    return (
        <section ref={sectionRef} className="py-8 md:py-16 bg-gradient-to-b from-white via-orange-50/30 to-white overflow-hidden" id="package-finder">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="text-center mb-6 md:mb-10">
                    <h2 className="text-2xl md:text-4xl font-bold text-slate-900 mb-3">
                        İşletmenize En Uygun Paketi Keşfedin
                    </h2>
                    <p className="text-slate-500 text-sm md:text-base max-w-2xl mx-auto">
                        4 kısa soruya cevap verin, UppyPro AI size özel paket önerisi hazırlasın.
                    </p>
                </div>

                {/* Progress Bar */}
                {step >= 1 && step <= 4 && (
                    <div className="max-w-lg mx-auto mb-8">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-slate-400">
                                Adım {currentProgress}/4
                            </span>
                            <span className="text-xs text-slate-400">
                                {currentProgress === 1 && "Sektör"}
                                {currentProgress === 2 && "Ekip Büyüklüğü"}
                                {currentProgress === 3 && "Sorunlar"}
                                {currentProgress === 4 && "Ek Bilgi"}
                            </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${(currentProgress / totalSteps) * 100}%` }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                            />
                        </div>
                    </div>
                )}

                {/* Steps Container */}
                <div className="max-w-3xl mx-auto">
                    <AnimatePresence mode="wait">

                        {/* INTRO */}
                        {step === 0 && (
                            <motion.div
                                key="intro"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="text-center"
                            >
                                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-5 md:p-8 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-orange-50 rounded-full blur-3xl -mr-20 -mt-20" />

                                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-8">
                                        {/* Left: Robot Image */}
                                        <div className="flex-shrink-0">
                                            <img
                                                src="/uppypro-question.png"
                                                alt="UppyPro AI Asistan"
                                                className="w-36 h-auto md:w-48 object-contain drop-shadow-lg"
                                            />
                                        </div>

                                        {/* Right: Text & Button */}
                                        <div className="flex flex-col items-center md:items-start text-center md:text-left">
                                            <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3">
                                                Merhaba! Ben <span className="text-orange-600">UppyPro</span>
                                            </h3>
                                            <p className="text-slate-500 text-sm md:text-base mb-6 max-w-md leading-relaxed">
                                                Size birkaç soru sorarak işletmeniz için en uygun paketi bulmama yardım edin.
                                                Cevaplarınıza göre <strong>kişisel önerimizi</strong> hazırlayacağım!
                                            </p>
                                            <button
                                                onClick={() => setStep(1)}
                                                className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl font-bold text-sm md:text-base shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 transition-all hover:scale-105 active:scale-95"
                                            >
                                                Hadi Başlayalım! <ArrowRight size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 1: SECTOR */}
                        {step === 1 && (
                            <motion.div
                                key="sector"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-5 md:p-8">
                                    <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-1">
                                        İşletmeniz hangi sektörde?
                                    </h3>
                                    <p className="text-slate-400 text-xs md:text-sm mb-5">Kendinize en yakın olanı seçin.</p>

                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
                                        {SECTORS.map(s => {
                                            const Icon = s.icon;
                                            const isSelected = sector === s.id;
                                            return (
                                                <button
                                                    key={s.id}
                                                    onClick={() => setSector(s.id)}
                                                    className={`p-3 md:p-4 rounded-xl border-2 text-center transition-all duration-200 hover:scale-[1.03] active:scale-95 ${
                                                        isSelected
                                                            ? "border-orange-500 bg-orange-50 shadow-md shadow-orange-100"
                                                            : "border-slate-100 bg-white hover:border-orange-200 hover:bg-orange-50/50"
                                                    }`}
                                                >
                                                    <Icon size={20} className={`mx-auto mb-1.5 ${isSelected ? "text-orange-600" : "text-slate-400"}`} />
                                                    <span className={`text-[11px] md:text-xs font-semibold block ${isSelected ? "text-orange-700" : "text-slate-600"}`}>
                                                        {s.label}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Other sector input */}
                                    <AnimatePresence>
                                        {sector === "other" && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <input
                                                    type="text"
                                                    value={sectorOther}
                                                    onChange={e => setSectorOther(e.target.value)}
                                                    placeholder="Sektörünüzü yazın..."
                                                    className="mt-4 w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition-all"
                                                />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Navigation */}
                                    <div className="flex justify-between items-center mt-6">
                                        <button onClick={() => setStep(0)} className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1">
                                            <ArrowLeft size={14} /> Geri
                                        </button>
                                        <button
                                            onClick={() => setStep(2)}
                                            disabled={!canProceed()}
                                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white rounded-xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange-600 transition-all active:scale-95"
                                        >
                                            Devam Et <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 2: TEAM SIZE */}
                        {step === 2 && (
                            <motion.div
                                key="team"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-5 md:p-8">
                                    <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-1">
                                        İşletmenizde kaç kişi çalışıyor?
                                    </h3>
                                    <p className="text-slate-400 text-xs md:text-sm mb-5">Ekip büyüklüğünüzü seçin.</p>

                                    <div className="grid grid-cols-2 gap-3">
                                        {TEAM_SIZES.map(t => {
                                            const Icon = t.icon;
                                            const isSelected = teamSize === t.id;
                                            return (
                                                <button
                                                    key={t.id}
                                                    onClick={() => setTeamSize(t.id)}
                                                    className={`p-4 md:p-5 rounded-xl border-2 text-left transition-all duration-200 hover:scale-[1.02] active:scale-95 flex items-center gap-3 ${
                                                        isSelected
                                                            ? "border-orange-500 bg-orange-50 shadow-md shadow-orange-100"
                                                            : "border-slate-100 bg-white hover:border-orange-200"
                                                    }`}
                                                >
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                                                        <Icon size={20} />
                                                    </div>
                                                    <div>
                                                        <span className={`text-sm font-bold block ${isSelected ? "text-orange-700" : "text-slate-700"}`}>{t.label}</span>
                                                        <span className="text-xs text-slate-400">{t.sublabel}</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="flex justify-between items-center mt-6">
                                        <button onClick={() => setStep(1)} className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1">
                                            <ArrowLeft size={14} /> Geri
                                        </button>
                                        <button
                                            onClick={() => setStep(3)}
                                            disabled={!canProceed()}
                                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white rounded-xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange-600 transition-all active:scale-95"
                                        >
                                            Devam Et <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 3: PROBLEMS */}
                        {step === 3 && (
                            <motion.div
                                key="problems"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-5 md:p-8">
                                    <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-1">
                                        En çok hangi konularda zorlanıyorsunuz?
                                    </h3>
                                    <p className="text-slate-400 text-xs md:text-sm mb-5">Birden fazla seçebilirsiniz.</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {PROBLEMS.map(p => {
                                            const Icon = p.icon;
                                            const isSelected = selectedProblems.includes(p.id);
                                            return (
                                                <button
                                                    key={p.id}
                                                    onClick={() => toggleProblem(p.id)}
                                                    className={`p-3 md:p-3.5 rounded-xl border-2 text-left transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] flex items-center gap-3 ${
                                                        isSelected
                                                            ? "border-orange-500 bg-orange-50"
                                                            : "border-slate-100 bg-white hover:border-orange-200"
                                                    }`}
                                                >
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                                                        {isSelected ? <CheckCircle2 size={16} /> : <Icon size={16} />}
                                                    </div>
                                                    <span className={`text-xs md:text-sm font-medium ${isSelected ? "text-orange-700" : "text-slate-600"}`}>
                                                        {p.label}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="flex justify-between items-center mt-6">
                                        <button onClick={() => setStep(2)} className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1">
                                            <ArrowLeft size={14} /> Geri
                                        </button>
                                        <button
                                            onClick={() => setStep(4)}
                                            disabled={!canProceed()}
                                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white rounded-xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange-600 transition-all active:scale-95"
                                        >
                                            Devam Et <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 4: EXTRA INFO */}
                        {step === 4 && (
                            <motion.div
                                key="extra"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-5 md:p-8">
                                    <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-1">
                                        Eklemek istediğiniz bir şey var mı?
                                    </h3>
                                    <p className="text-slate-400 text-xs md:text-sm mb-5">
                                        İşletmenizle ilgili detay paylaşabilirsiniz. (Opsiyonel)
                                    </p>

                                    <textarea
                                        value={extraInfo}
                                        onChange={e => setExtraInfo(e.target.value.slice(0, 500))}
                                        placeholder="Örn: Güzellik salonumuzda 3 kuaför çalışıyor, Instagram'dan çok mesaj alıyoruz ama cevap veremediklerimiz müşteri kaybına yol açıyor..."
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none min-h-[100px] resize-none transition-all"
                                        rows={4}
                                    />
                                    <div className="text-right text-xs text-slate-300 mt-1">{extraInfo.length}/500</div>

                                    {error && (
                                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
                                            {error}
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center mt-4">
                                        <button onClick={() => setStep(3)} className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1">
                                            <ArrowLeft size={14} /> Geri
                                        </button>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={loading}
                                            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/25 hover:shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
                                        >
                                            {loading ? (
                                                <><Loader2 size={16} className="animate-spin" /> Analiz Ediliyor...</>
                                            ) : (
                                                <><Sparkles size={16} /> Önerimi Göster</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 5: RESULT */}
                        {step === 5 && (
                            <motion.div
                                key="result"
                                ref={resultRef}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                                    {/* Header */}
                                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 md:p-6 flex items-center gap-3">
                                        <img
                                            src="/uppypro-assistant.png"
                                            alt="UppyPro"
                                            className="w-10 h-10 md:w-12 md:h-12 object-contain rounded-full bg-white/10 p-1"
                                        />
                                        <div>
                                            <h4 className="text-white font-bold text-sm md:text-base">UppyPro AI Danışman</h4>
                                            <p className="text-slate-400 text-xs">
                                                {loading ? "Analiz ediliyor..." : "Kişisel öneriniz hazır!"}
                                            </p>
                                        </div>
                                        {!loading && (
                                            <div className="ml-auto">
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
                                                    <CheckCircle2 size={12} /> Hazır
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="p-5 md:p-8">
                                        {loading ? (
                                            <div className="flex flex-col items-center py-12">
                                                <div className="relative">
                                                    <img
                                                        src="/uppypro-assistant.png"
                                                        alt="UppyPro"
                                                        className="w-20 h-20 object-contain animate-bounce"
                                                    />
                                                </div>
                                                <p className="text-slate-500 mt-4 text-sm font-medium">
                                                    İşletmenizi analiz ediyorum...
                                                </p>
                                                <div className="flex gap-1 mt-3">
                                                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {/* AI Response */}
                                                <div className="prose prose-sm prose-slate max-w-none mb-6 
                                                    prose-strong:text-orange-600 
                                                    prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
                                                    prose-li:text-slate-600 prose-p:text-slate-600
                                                    prose-li:marker:text-orange-400">
                                                    <ReactMarkdown>{displayedText}</ReactMarkdown>
                                                    {isTyping && (
                                                        <span className="inline-block w-1.5 h-4 bg-orange-500 animate-pulse ml-0.5 align-text-bottom" />
                                                    )}
                                                </div>

                                                {/* CTA Buttons */}
                                                {!isTyping && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: 0.3 }}
                                                        className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-100"
                                                    >
                                                        <a
                                                            href="/#pricing"
                                                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white rounded-xl font-bold text-sm shadow-lg shadow-green-500/25 hover:shadow-xl transition-all hover:scale-105"
                                                        >
                                                            <Gift size={16} /> 7 Gün Ücretsiz Başla
                                                        </a>
                                                        <a
                                                            href="#pricing"
                                                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/25 hover:shadow-xl transition-all hover:scale-105"
                                                        >
                                                            Paketleri İncele <ChevronRight size={16} />
                                                        </a>
                                                        <button
                                                            onClick={reset}
                                                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-slate-200 text-slate-500 rounded-xl font-semibold text-sm hover:border-orange-300 hover:text-orange-600 transition-all"
                                                        >
                                                            <RotateCcw size={14} /> Tekrar Dene
                                                        </button>
                                                    </motion.div>
                                                )}


                                            </>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
}
