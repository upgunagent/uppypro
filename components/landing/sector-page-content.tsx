"use client";

import { useState } from "react";
import Link from "next/link";
import { LandingHeader, LandingFooter } from "@/components/landing/layout";
import { CheckCircle2, ArrowRight, MessageSquare, Calendar, Bot, Users, TrendingUp, Clock, Zap, XCircle } from "lucide-react";

const ICON_MAP: Record<string, any> = {
    calendar: Calendar, bot: Bot, message: MessageSquare, users: Users,
};

export interface SectorData {
    name: string; title: string; description: string;
    heroText: string; problems: string[];
    solutions: { title: string; desc: string; icon: string }[];
    features: string[]; cta: string;
    scenario?: string;
    stats?: { value: string; label: string; desc: string }[];
    beforeAfter?: { before: string; after: string }[];
}

export function SectorPageContent({ sector }: { sector: SectorData }) {

    return (
        <>
            <div className="min-h-screen bg-white font-sans text-slate-900">
                <LandingHeader />
                <main>
                    {/* Hero */}
                    <section className="relative bg-slate-900 text-white py-20 md:py-28 overflow-hidden">
                        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5" />
                        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                            <div className="text-center">
                                <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">{sector.title}</h1>
                                <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed mb-8">{sector.heroText}</p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <Link
                                        href="/#pricing"
                                        className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-semibold text-lg transition-colors shadow-lg shadow-orange-500/30 text-center"
                                    >
                                        7 Gün Ücretsiz Başla
                                    </Link>
                                    <Link href="/#pricing" className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-full font-semibold text-lg transition-colors backdrop-blur-sm border border-white/20 text-center">
                                        Paketini Seç
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Problems */}
                    <section className="py-16 md:py-24 bg-slate-50">
                        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                            <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">Bu Sorunlar Tanıdık Geldi mi?</h2>
                            <p className="text-slate-500 text-center mb-12 max-w-2xl mx-auto">Her gün karşılaştığınız bu sorunların çözümü yapay zeka destekli iletişim yönetiminde.</p>
                            <div className="space-y-4 max-w-2xl mx-auto">
                                {sector.problems.map((problem, i) => (
                                    <div key={i} className="flex items-start gap-4 bg-white rounded-xl p-5 border border-red-100 shadow-sm">
                                        <span className="flex-shrink-0 w-8 h-8 bg-red-100 text-red-500 rounded-full flex items-center justify-center font-bold text-sm">{i + 1}</span>
                                        <p className="text-slate-700">{problem}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Scenario — Real story */}
                    {sector.scenario && (
                        <section className="py-16 md:py-24 bg-white">
                            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                                <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">Gerçek Bir Senaryo</h2>
                                <p className="text-slate-500 text-center mb-10 max-w-2xl mx-auto">UppyPro&apos;nun {sector.name.toLowerCase()} sektöründe nasıl fark yarattığını görün.</p>
                                <div className="relative bg-gradient-to-br from-slate-50 to-orange-50/30 rounded-3xl p-8 md:p-12 border border-slate-200">
                                    <div className="absolute top-6 left-8 text-6xl text-orange-200 font-serif leading-none">&ldquo;</div>
                                    <div className="relative z-10 pt-8">
                                        <p className="text-slate-700 text-lg md:text-xl leading-relaxed whitespace-pre-line">{sector.scenario}</p>
                                    </div>
                                    <div className="absolute bottom-6 right-8 text-6xl text-orange-200 font-serif leading-none">&rdquo;</div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Stats — Numbers */}
                    {sector.stats && sector.stats.length > 0 && (
                        <section className="py-16 md:py-24 bg-slate-900 text-white">
                            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                                <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">Rakamlarla Fark</h2>
                                <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">UppyPro kullanan {sector.name.toLowerCase()} işletmelerinin ortalama sonuçları.</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    {sector.stats.map((stat, i) => (
                                        <div key={i} className="text-center bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-orange-500/30 transition-colors">
                                            <div className="text-3xl md:text-4xl font-extrabold text-orange-400 mb-2">{stat.value}</div>
                                            <div className="text-sm font-semibold text-white mb-1">{stat.label}</div>
                                            <div className="text-xs text-slate-400">{stat.desc}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Solutions */}
                    <section className="py-16 md:py-24">
                        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                            <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">UppyPro ile Çözüm</h2>
                            <p className="text-slate-500 text-center mb-12 max-w-2xl mx-auto">Yapay zeka destekli asistanınız, {sector.name.toLowerCase()} sektörüne özel çözümler sunar.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {sector.solutions.map((sol, i) => {
                                    const Icon = ICON_MAP[sol.icon] || Bot;
                                    return (
                                        <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-orange-300 hover:shadow-lg transition-all group">
                                            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-orange-500 transition-colors">
                                                <Icon className="w-6 h-6 text-orange-600 group-hover:text-white transition-colors" />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900 mb-2">{sol.title}</h3>
                                            <p className="text-slate-500 leading-relaxed">{sol.desc}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    {/* Before/After Comparison */}
                    {sector.beforeAfter && sector.beforeAfter.length > 0 && (
                        <section className="py-16 md:py-24 bg-slate-900">
                            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                                <h2 className="text-2xl md:text-3xl font-bold text-center mb-4 text-white">UppyPro Öncesi vs Sonrası</h2>
                                <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">İşletmenizin günlük operasyonlarında yaşayacağınız dönüşüm.</p>
                                <div className="max-w-3xl mx-auto space-y-4">
                                    {/* Header */}
                                    <div className="grid grid-cols-2 gap-4 mb-2">
                                        <div className="text-center">
                                            <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-full text-sm font-bold border border-red-500/30">
                                                <XCircle className="w-4 h-4" /> UppyPro Öncesi
                                            </span>
                                        </div>
                                        <div className="text-center">
                                            <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-full text-sm font-bold border border-green-500/30">
                                                <CheckCircle2 className="w-4 h-4" /> UppyPro Sonrası
                                            </span>
                                        </div>
                                    </div>
                                    {/* Rows */}
                                    {sector.beforeAfter.map((item, i) => (
                                        <div key={i} className="grid grid-cols-2 gap-4">
                                            <div className="bg-white/5 rounded-xl p-4 border border-red-500/20 text-slate-300 text-sm leading-relaxed">
                                                {item.before}
                                            </div>
                                            <div className="bg-white/5 rounded-xl p-4 border border-green-500/20 text-slate-200 text-sm leading-relaxed font-medium">
                                                {item.after}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Features List */}
                    <section className="py-16 md:py-24">
                        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">{sector.name} İçin Tüm Özellikler</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                                {sector.features.map((feature, i) => (
                                    <div key={i} className="flex items-center gap-3 bg-white rounded-xl p-4 border border-slate-200">
                                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                                        <span className="text-slate-700 font-medium">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* CTA */}
                    <section className="py-16 md:py-24 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                        <div className="max-w-3xl mx-auto px-4 text-center">
                            <h2 className="text-2xl md:text-4xl font-bold mb-6">{sector.cta}</h2>
                            <p className="text-orange-100 mb-8 text-lg">7 gün ücretsiz deneme süresi ile UppyPro&apos;yu keşfedin.</p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link
                                    href="/#pricing"
                                    className="px-8 py-4 bg-white text-orange-600 rounded-full font-semibold text-lg hover:bg-orange-50 transition-colors shadow-lg text-center"
                                >
                                    Hemen Başla <ArrowRight className="inline w-5 h-5 ml-1" />
                                </Link>
                                <Link href="/#contact" className="px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-full font-semibold text-lg transition-colors border border-orange-400 text-center">
                                    Bize Ulaşın
                                </Link>
                            </div>
                        </div>
                    </section>
                </main>
                <LandingFooter />
            </div>
        </>
    );
}
