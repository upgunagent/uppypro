"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Image from "next/image";

export function SolutionsSection() {
    return (
        <section id="solutions" className="py-12 md:py-24 bg-white">
            <div className="container mx-auto px-4">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <div className="inline-block px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full mb-4">
                        TERZİ İŞİ YAZILIM
                    </div>
                    <h2 className="text-4xl font-bold text-slate-900 mb-4">Çözümlerimiz</h2>
                    <p className="text-slate-500 text-lg">
                        Sektörünüz ne olursa olsun, işletmenizin ihtiyaçlarına tam uyan akıllı sistemler geliştiriyoruz.
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                    {/* Left: Image */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="relative"
                    >
                        <div className="absolute -inset-4 bg-gradient-to-tr from-orange-100 to-blue-50 rounded-[2rem] transform -rotate-2 -z-10" />
                        <div className="bg-white p-2 rounded-2xl shadow-xl border border-slate-100">
                            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-50">
                                <Image
                                    src="/solutions-banner.jpg"
                                    alt="UPGUN AI Çözümleri"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        </div>
                    </motion.div>

                    {/* Right: Content */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="space-y-6"
                    >
                        <div className="space-y-4">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
                                İşletmenizin DNA'sına Uygun, <span className="text-orange-600">Sınırları Kaldıran Çözümler</span>
                            </h2>

                            <div className="space-y-4 text-slate-600 leading-relaxed text-lg">
                                <p>
                                    İşletmenizin vizyonu standartların ötesindeyse, kullandığınız yazılım da size ayak uydurmalı. UPGUN AI olarak, "terzi işi" yaklaşımımızla sektörünüzün dinamiklerine <strong className="text-slate-900 font-semibold">%100 uyumlu akıllı yönetim panelleri</strong> tasarlıyoruz.
                                </p>
                                <p>
                                    Sadece standart bir CRM değil; <strong className="text-slate-900 font-semibold">sağlık ve turizmde</strong> kusursuz rezervasyon yönetiminden, <strong className="text-slate-900 font-semibold">perakendede</strong> müşteri sadakat programlarına; <strong className="text-slate-900 font-semibold">insan kaynaklarında</strong> aday havuzlarını otomatize eden iş akışlarından, <strong className="text-slate-900 font-semibold">depo ve proje takibine</strong> kadar geniş bir yelpazede çözüm üretiyoruz.
                                </p>
                                <p>
                                    Geliştirdiğimiz sistemler, otomatik teklif oluşturma, anlık veri takibi ve detaylı raporlama araçlarıyla <strong className="text-slate-900 font-semibold">finanstan operasyona</strong> tüm birimlerinizi tek bir bulut merkezinde birleştirir. Manuel süreçleri geride bırakın; <strong className="text-slate-900 font-semibold">uçtan uca müşteri yönetimi</strong> ve yapay zeka destekli analizlerle hatasız, hızlı ve dijital bir geleceğe adım atın.
                                </p>
                            </div>

                            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mt-6 rounded-r-lg">
                                <p className="text-orange-900 font-medium italic">
                                    "Aklınızdaki projeyi gerçeğe dönüştürmek ve size en uygun yol haritasını belirlemek için hemen tanışalım."
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
