"use client";

import { Check, ArrowRight, Zap, MessageSquare, Users, BarChart3, ShieldCheck, Send } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { clsx } from "clsx";

export function FeaturesSection() {
    const features = [
        {
            icon: <MessageSquare className="w-6 h-6 text-white" />,
            color: "bg-blue-500",
            title: "Tek Inbox",
            desc: "WhatsApp ve Instagram tek bir ekranda. Sekmeler arası kaybolmaya son."
        },
        {
            icon: <Zap className="w-6 h-6 text-white" />,
            color: "bg-orange-500",
            title: "AI Otomasyon",
            desc: "Standart sorulara saniyeler içinde doğal dilde yanıt verin. 7/24 aktif."
        },
        {
            icon: <Users className="w-6 h-6 text-white" />,
            color: "bg-green-500",
            title: "Müşteri Kartı",
            desc: "Müşteri bilgilerini, notlarını ve geçmişini sohbet anında görün."
        },
        {
            icon: <ShieldCheck className="w-6 h-6 text-white" />,
            color: "bg-purple-500",
            title: "Devral / Devret",
            desc: "AI ile müşteri arasında tam kontrol. İstediğiniz an sohbete girin."
        }
    ];

    return (
        <section id="features" className="py-24 bg-slate-50">
            <div className="container mx-auto px-4">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-3xl font-bold text-slate-900 mb-4">Mesaj Yönetimini Satışa Çevirin</h2>
                    <p className="text-slate-500">
                        Karmaşık panellere ve excel tablolarına veda edin. UppyPro ile müşteri iletişimi hiç bu kadar kolay olmamıştı.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {features.map((f, i) => (
                        <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl transition-shadow duration-300 group">
                            <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center mb-6 shadow-lg transform group-hover:scale-110 transition-transform", f.color)}>
                                {f.icon}
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">{f.title}</h3>
                            <p className="text-slate-500 leading-relaxed text-sm">
                                {f.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export function PricingSection() {
    return (
        <section id="pricing" className="py-24 bg-white relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-orange-50/50 rounded-full blur-3xl pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <div className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full mb-4">
                        UYGUN FİYATLANDIRMA
                    </div>
                    <h2 className="text-4xl font-bold text-slate-900 mb-4">İşletmenize Uygun Paketi Seçin</h2>
                    <p className="text-slate-500 text-lg">
                        Taahhüt yok, gizli ücret yok. Büyüdükçe paketinizi yükseltin.
                    </p>
                </div>

                <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-start">
                    {/* Basic Plan */}
                    {/* Basic Plan */}
                    <div className="bg-gradient-to-br from-green-500 to-blue-900 p-8 rounded-3xl shadow-lg hover:shadow-xl transition-all relative group text-white">
                        <h3 className="text-xl font-bold text-white mb-2">UppyPro Inbox</h3>
                        <p className="text-slate-100 text-sm mb-6">Küçük işletmeler ve butikler için.</p>
                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-4xl font-extrabold text-white">495 TL</span>
                            <span className="text-slate-200">/ay</span>
                        </div>
                        <Link href="/uyelik?plan=base">
                            <Button className="w-full h-12 rounded-xl mb-8 bg-white text-slate-900 font-bold hover:bg-slate-50 hover:text-green-600 transition-colors border-0">
                                Paketi Seç
                            </Button>
                        </Link>
                        <ul className="space-y-4 text-sm text-slate-100">
                            <li className="flex items-center gap-3"><Check className="w-5 h-5 text-white flex-shrink-0" /> Instagram + WhatsApp</li>
                            <li className="flex items-center gap-3"><Check className="w-5 h-5 text-white flex-shrink-0" /> Tek Inbox Yönetimi</li>
                            <li className="flex items-center gap-3"><Check className="w-5 h-5 text-white flex-shrink-0" /> Temel Müşteri Kartı</li>
                            <li className="flex items-center gap-3 text-slate-300"><Check className="w-5 h-5 text-slate-300 flex-shrink-0" /> AI Asistan Desteği (Yok)</li>
                        </ul>
                    </div>

                    {/* AI Plan (Highlighted) */}
                    <div className="bg-slate-900 p-8 rounded-3xl shadow-2xl ring-4 ring-orange-500/20 relative transform lg:-translate-y-4">
                        <div className="absolute top-0 right-0 left-0 -mt-4 flex justify-center">
                            <span className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg">
                                En Çok Tercih Edilen
                            </span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">UppyPro AI</h3>
                        <p className="text-slate-400 text-sm mb-6">Otomasyon isteyen büyüyen markalar.</p>
                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-5xl font-extrabold text-white">2.499 TL</span>
                            <span className="text-slate-500">/ay</span>
                        </div>
                        <Link href="/uyelik?plan=ai_starter">
                            <Button className="w-full h-12 rounded-xl mb-8 bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-lg shadow-orange-500/25">
                                AI Paketi Seç
                            </Button>
                        </Link>
                        <ul className="space-y-4 text-sm text-slate-300">
                            <li className="flex items-center gap-3"><Check className="w-5 h-5 text-orange-500 flex-shrink-0" /> <span className="text-white font-medium">Her şey dahil (Inbox)</span></li>
                            <li className="flex items-center gap-3"><Check className="w-5 h-5 text-orange-500 flex-shrink-0" /> <span className="text-white font-medium">Bilgi Veren AI Asistan</span></li>
                            <li className="flex items-center gap-3"><Check className="w-5 h-5 text-orange-500 flex-shrink-0" /> 7/24 Anında Yanıt</li>
                            <li className="flex items-center gap-3"><Check className="w-5 h-5 text-orange-500 flex-shrink-0" /> Devral / Teslim Et Modu</li>
                        </ul>
                    </div>

                    {/* Enterprise Plan */}
                    {/* Enterprise Plan */}
                    <div className="bg-gradient-to-br from-purple-700 to-indigo-900 p-8 rounded-3xl shadow-lg hover:shadow-xl transition-all relative group text-white">
                        <h3 className="text-xl font-bold text-white mb-2">UppyPro Kurumsal</h3>
                        <p className="text-slate-200 text-sm mb-6">Özel çözümler ve yüksek hacimler.</p>
                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-3xl font-bold text-white">Teklif Al</span>
                        </div>
                        <Button className="w-full h-12 rounded-xl mb-8 bg-white text-slate-900 font-bold hover:bg-slate-50 hover:text-purple-700 transition-colors border-0">
                            İletişime Geç
                        </Button>
                        <ul className="space-y-4 text-sm text-slate-200">
                            <li className="flex items-center gap-3"><Check className="w-5 h-5 text-white flex-shrink-0" /> Sınırsız Mesaj Hacmi</li>
                            <li className="flex items-center gap-3"><Check className="w-5 h-5 text-white flex-shrink-0" /> Özel CRM Entegrasyonu</li>
                            <li className="flex items-center gap-3"><Check className="w-5 h-5 text-white flex-shrink-0" /> Özel AI Eğitimi</li>
                            <li className="flex items-center gap-3"><Check className="w-5 h-5 text-white flex-shrink-0" /> 7/24 Öncelikli Destek</li>
                        </ul>
                    </div>
                </div>

                <p className="mt-12 text-center text-sm text-slate-400">
                    * Tüm fiyatlara KDV eklenecektir. Yıllık alımlarda %20 indirim uygulanır.
                </p>
            </div>
        </section>
    );
}

export function HowItWorks() {
    return (
        <section className="py-24 bg-white border-b border-gray-50">
            <div className="container mx-auto px-4">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold text-orange-600 mb-4">Nasıl Çalışır?</h2>
                    <p className="text-slate-500 text-lg">
                        Karmaşık kurulumlar yok. 3 basit adımda panelinizi kullanmaya başlayın.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-12 relative">
                    {/* Connecting Line (Hidden on Mobile) */}
                    <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-orange-100 via-orange-200 to-orange-100 -z-10" />

                    {/* Step 1 */}
                    <div className="text-center relative">
                        <div className="w-24 h-24 bg-white rounded-full border-4 border-orange-50 flex items-center justify-center mx-auto mb-6 shadow-sm z-10 relative">
                            <div className="text-3xl font-black text-orange-500">1</div>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">Kanalları Bağla</h3>
                        <p className="text-slate-500 text-sm leading-relaxed px-4">
                            WhatsApp Business ve Instagram hesaplarını otomatik izin  girişleri ile 2 dakikada bağla.
                        </p>
                    </div>

                    {/* Step 2 */}
                    <div className="text-center relative">
                        <div className="w-24 h-24 bg-white rounded-full border-4 border-orange-50 flex items-center justify-center mx-auto mb-6 shadow-sm z-10 relative">
                            <div className="text-3xl font-black text-orange-500">2</div>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">Tek Panelde Yönet</h3>
                        <p className="text-slate-500 text-sm leading-relaxed px-4">
                            Tüm mesajlar tek bir inbox'a düşsün. Ekip arkadaşlarınla karmaşa yaşamadan yanıtla.
                        </p>
                    </div>

                    {/* Step 3 */}
                    <div className="text-center relative">
                        <div className="w-24 h-24 bg-white rounded-full border-4 border-orange-50 flex items-center justify-center mx-auto mb-6 shadow-sm z-10 relative">
                            <div className="text-3xl font-black text-orange-500">3</div>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">Yapay Zeka'ya Devret</h3>
                        <p className="text-slate-500 text-sm leading-relaxed px-4">
                            Mesai saati dışında veya yoğunlukta AI modunu aç. O müşterilerle ilgilensin, müşterilerilerini ve satışları kaçırma.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    )
}

export function ContactSection() {
    return (
        <section id="contact" className="py-24 bg-white">
            <div className="container mx-auto px-4">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Left Content */}
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <h2 className="text-4xl font-bold text-slate-900 leading-tight">
                                15 Dakikalık Ücretsiz Analiz Görüşmesi Planlayın
                            </h2>
                            <p className="text-slate-500 text-lg leading-relaxed">
                                Aşağıdaki formu doldurun, sizinle kısa bir online toplantı planlayalım. 15 dakika içinde, hangi işleri otomasyona devredebileceğimizi ve ilk etapta ne kadarlık bir zaman/maliyet tasarrufu sağlayabileceğimizi birlikte görelim.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {[
                                "Hangi işleri otomasyona devredebileceğinizi görün",
                                "Zaman ve maliyet tasarrufu potansiyelini keşfedin",
                                "Herhangi bir taahhüt yok, tamamen ücretsiz"
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                                        <Check className="w-3 h-3 text-orange-600" />
                                    </div>
                                    <span className="text-slate-600 font-medium">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Form */}
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                        <form className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Ad Soyad *</label>
                                <input type="text" placeholder="Örn: Ahmet Yılmaz" className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Firma Adı</label>
                                <input type="text" placeholder="Örn: XYZ Teknoloji" className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">E-posta *</label>
                                    <input type="email" placeholder="ornek@email.com" className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Telefon *</label>
                                    <input type="tel" placeholder="+90 555 123 45 67" className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Şu an en çok zorlandığınız süreç nedir? *</label>
                                <textarea placeholder="Örn: Müşteri mesajlarına geç cevap veriyoruz ve randevu yönetimi çok vakit alıyor..." className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
                            </div>

                            <Button className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20">
                                <Send className="w-4 h-4 mr-2" />
                                Görüşme Talep Et
                            </Button>
                        </form>

                        <div className="pt-4 text-center space-y-3">
                            <p className="text-xs text-slate-400">Dilerseniz direkt WhatsApp üzerinden de yazabilirsiniz.</p>
                            <Button variant="outline" className="w-full border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700 font-bold h-10 rounded-xl">
                                <MessageSquare className="w-4 h-4 mr-2" />
                                WhatsApp'tan Yaz
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
