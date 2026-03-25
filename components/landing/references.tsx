"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

const references = [
    {
        id: "gyiad",
        logo: "/referans/gyiad.png",
        title: "GYİAD Üye Platformu",
        description:
            "Genç İş Adamları Derneği (GYİAD) için üye paneli ve yönetici paneli olmak üzere iki kapsamlı platform tasarladık. Üye panelinde; her üye kurumsal profilini oluşturarak dernek içi görev ve yetkilerine özel sayfalara erişim sağlıyor. Üyeler birbirlerinin kurumsal profillerini görüntüleyerek iş bağlantıları kurabiliyor, dernek yöneticilerinden etkinlik taleplerinde bulunabiliyor ve üyeler arası iletişim kanallarıyla güçlü iş birlikleri oluşturabiliyor. Yönetici panelinde ise üye kayıt, güncelleme ve iptal işlemleri tek merkezden yönetiliyor. Detaylı üye raporları, toplu bildirim ve duyuru yönetimi, üyelerden gelen taleplerin takibi ve cevaplanması gibi tüm süreçler dijitalleştirildi. Platform sayesinde dernek yönetimi, üye etkileşimini artırırken operasyonel süreçlerini de büyük ölçüde hızlandırdı.",
        images: [
            "/referans/gyiad-1.png",
            "/referans/gyiad-2.png",
            "/referans/gyiad-3.png",
        ],
        bgColor: "from-sky-50 to-blue-50",
        accentColor: "border-orange-500",
        tags: ["Üye Yönetimi", "Yönetici Paneli", "Etkinlik Yönetimi"],
    },
    {
        id: "ustunpatent",
        logo: "/referans/ustunpatent.png",
        title: "Üstün Patent Marka Araştırma/İzleme Paneli",
        description:
            "Üstün Patent için yapay zeka destekli bir marka araştırma, izleme ve CRM platformu geliştirdik. Türk Patent Enstitüsü'nün yayımladığı bültenlerdeki tüm marka başvuruları, yapay zeka ile otomatik olarak veri tabanına işleniyor. Panel üzerinden markaların benzerlik skorlarına göre detaylı araştırma ve listeleme yapılabiliyor. Firmaların aylık marka izleme süreçleri tamamen otomatize edildi; daha önce 15 günde tamamlanan işlemler, paneldeki otomasyon sayesinde yalnızca 2 güne indirildi. Otomatik benzerlik raporları, sözleşme oluşturma, kurumsal mail gönderimi, marka tescil tarihlerinin hatırlatılması gibi kritik süreçlerin tamamı panel üzerinden yönetiliyor. Ekip, dünyanın her yerinden ofis ortamına ihtiyaç duymadan tüm iş süreçlerini kesintisiz yürütebiliyor.",
        images: [
            "/referans/ustunpatent-1.png",
            "/referans/ustunpatent-2.png",
            "/referans/ustunpatent-3.png",
        ],
        bgColor: "from-indigo-50 to-slate-50",
        accentColor: "border-orange-500",
        tags: ["Yapay Zeka", "Otomasyon", "CRM"],
    },
    {
        id: "omuzomuza",
        logo: "/referans/omuzomuza.png",
        title: "Omuzomuza İnsan Kaynakları Yönetim Paneli",
        description:
            "Omuzomuza Engelsiz İnsan Kaynakları için aday, danışman ve yönetici olmak üzere üç farklı panelden oluşan kapsamlı bir İK yönetim sistemi tasarladık. Engelli bireylerin işe alım süreçlerinde hizmet veren bu firmada; adaylar tüm aktif ilanları görüp özgeçmişleriyle başvuru yapabiliyor ve süreçlerini anlık olarak takip edebiliyor. Danışman panelinde; CV bankasından aday taraması, görüşme notları, engelli raporları takibi, pozisyon bazlı aday raporları hazırlama ve firmalara otomatik bilgilendirme mailleri gönderme gibi işlemler tek merkezden yönetiliyor. Yönetici panelinde ise ilan yönetimi, danışmanlara pozisyon atama, firma kayıtları, tüm aday bilgileri ve raporlara erişim sağlanıyor. Aday, danışman ve yönetici üçgeninde tüm iş süreçleri otomatize edildi ve tek platform üzerinden uçtan uca yönetilebilir hale getirildi.",
        images: [
            "/referans/omuzomuza-1.png",
            "/referans/omuzomuza-2.png",
            "/referans/omuzomuza-3.png",
        ],
        bgColor: "from-amber-50 to-orange-50",
        accentColor: "border-orange-500",
        tags: ["İK Yönetimi", "Aday Takibi", "Otomasyon"],
    },
];

function ImageCarousel({ images, title }: { images: string[]; title: string }) {
    const [current, setCurrent] = useState(0);

    // Reset to first image when images change
    useEffect(() => {
        setCurrent(0);
    }, [images]);

    const goNext = useCallback(() => {
        setCurrent((prev) => (prev + 1) % images.length);
    }, [images.length]);

    const goPrev = useCallback(() => {
        setCurrent((prev) => (prev - 1 + images.length) % images.length);
    }, [images.length]);

    return (
        <div className="relative group/carousel">
            <div className="bg-white p-2 rounded-xl shadow-lg border border-slate-100 overflow-hidden">
                <div className="relative aspect-[4/3] w-full rounded-lg overflow-hidden bg-slate-50">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={current}
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0"
                        >
                            <Image
                                src={images[current]}
                                alt={`${title} - Görsel ${current + 1}`}
                                fill
                                className="object-contain p-2"
                            />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Navigation Arrows */}
            <button
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-8 h-8 bg-white rounded-full shadow-lg border border-slate-200 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hover:bg-orange-50 hover:border-orange-300 z-10"
            >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 w-8 h-8 bg-white rounded-full shadow-lg border border-slate-200 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hover:bg-orange-50 hover:border-orange-300 z-10"
            >
                <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>

            {/* Dots */}
            <div className="flex justify-center gap-2 mt-3">
                {images.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={(e) => { e.stopPropagation(); setCurrent(idx); }}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            idx === current
                                ? "bg-orange-500 w-5"
                                : "bg-slate-300 hover:bg-slate-400"
                        }`}
                    />
                ))}
            </div>
        </div>
    );
}

export function ReferencesSection() {
    const [activeId, setActiveId] = useState<string | null>(null);

    const handleToggle = (id: string) => {
        setActiveId((prev) => (prev === id ? null : id));
    };

    const activeRef = references.find((r) => r.id === activeId);

    return (
        <section id="referanslar" className="py-16 md:py-24 bg-gradient-to-b from-slate-50 to-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center max-w-2xl mx-auto mb-14"
                >
                    <h2 className="text-4xl font-bold text-slate-900 mb-4">Referanslarımız</h2>
                    <p className="text-slate-500 text-lg">
                        Farklı sektörlerden firmalar için geliştirdiğimiz özel çözümlere örnek proje referanslarımız.
                    </p>
                </motion.div>

                {/* Logo Cards */}
                <div className="grid grid-cols-3 gap-3 sm:gap-6 max-w-4xl mx-auto mb-2">
                    {references.map((ref, index) => {
                        const isActive = activeId === ref.id;
                        return (
                            <motion.button
                                key={ref.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: index * 0.1 }}
                                onClick={() => handleToggle(ref.id)}
                                className={`
                                    group relative flex flex-col items-center justify-center
                                    rounded-2xl p-3 md:p-4
                                    transition-all duration-300 ease-out cursor-pointer
                                    border-2
                                    ${
                                        isActive
                                            ? `bg-white shadow-xl shadow-orange-100/60 ${ref.accentColor} scale-[1.03]`
                                            : "bg-white/70 border-slate-200/80 shadow-md hover:shadow-lg hover:border-orange-300 hover:scale-[1.02]"
                                    }
                                `}
                            >
                                {/* Active indicator dot */}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeDot"
                                        className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-orange-500 rounded-full shadow-md"
                                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                    />
                                )}

                                <div
                                    className={`
                                        relative w-full aspect-[16/9] flex items-center justify-center
                                        rounded-xl overflow-hidden
                                        transition-all duration-300
                                        ${isActive ? "bg-gradient-to-br " + ref.bgColor : "bg-slate-50 group-hover:bg-gradient-to-br group-hover:" + ref.bgColor}
                                    `}
                                >
                                    <Image
                                        src={ref.logo}
                                        alt={ref.title}
                                        fill
                                        className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                                    />
                                </div>

                                {/* Bottom active bar */}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeBar"
                                        className="absolute -bottom-[2px] left-4 right-4 h-[3px] bg-orange-500 rounded-full"
                                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                    />
                                )}
                            </motion.button>
                        );
                    })}
                </div>

                {/* Detail Panel */}
                <AnimatePresence mode="wait">
                    {activeRef && (
                        <motion.div
                            key={activeRef.id}
                            initial={{ opacity: 0, height: 0, y: -10 }}
                            animate={{ opacity: 1, height: "auto", y: 0 }}
                            exit={{ opacity: 0, height: 0, y: -10 }}
                            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                            className="overflow-hidden max-w-4xl mx-auto"
                        >
                            <div
                                className={`
                                    mt-6 rounded-2xl border-2 ${activeRef.accentColor}
                                    bg-white shadow-xl shadow-slate-200/50
                                    p-6 md:p-10
                                `}
                            >
                                <div className="grid md:grid-cols-2 gap-8 items-start">
                                    {/* Left - Image Carousel */}
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.5, delay: 0.15 }}
                                        className="relative"
                                    >
                                        <div className={`absolute -inset-3 bg-gradient-to-tr ${activeRef.bgColor} rounded-[1.5rem] transform -rotate-1 -z-10 opacity-60`} />
                                        <ImageCarousel images={activeRef.images} title={activeRef.title} />
                                    </motion.div>

                                    {/* Right - Description */}
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.5, delay: 0.25 }}
                                        className="space-y-5"
                                    >
                                        <h3 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                                            {activeRef.title}
                                        </h3>

                                        <p className="text-slate-600 text-sm md:text-base leading-relaxed">
                                            {activeRef.description}
                                        </p>

                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {activeRef.tags.map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 text-slate-600 border border-slate-200"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </motion.div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
}
