import { Metadata } from "next";
import Link from "next/link";
import { LandingHeader, LandingFooter } from "@/components/landing/layout";
import { Zap, Globe, Brain, HeartHandshake, Shield, Sparkles, MessageSquare, Calendar, Users, BarChart3, Mail, Languages, PenTool, Building2, Scissors, Stethoscope, Hotel, UtensilsCrossed, ShoppingCart, GraduationCap, Home, Car, ShieldCheck, Focus, Headset, Wallet } from "lucide-react";

export const metadata: Metadata = {
    title: "Hakkımızda | UPGUN AI — Yapay Zeka İle İşletme İletişimi",
    description: "UPGUN AI, yapay zeka teknolojisini işletmelerin günlük iletişim süreçlerine entegre eden bir teknoloji şirketidir. UppyPro ile WhatsApp ve Instagram iletişiminizi dönüştürün.",
    alternates: { canonical: "https://www.upgunai.com/hakkimizda" },
};

const FEATURES = [
    { icon: Brain, title: "AI Asistan", desc: "7/24 otomatik, doğal ve kişiselleştirilmiş yanıtlar" },
    { icon: MessageSquare, title: "Çok Kanallı İletişim", desc: "WhatsApp ve Instagram DM tek panelde" },
    { icon: Calendar, title: "Akıllı Takvim", desc: "Çoklu personel takvimi, otomatik randevu ve hatırlatma" },
    { icon: Users, title: "Ekip Yönetimi", desc: "Aynı numaradan çoklu kullanıcı, departman ataması" },
    { icon: BarChart3, title: "CRM & Takip", desc: "Müşteri kartı, hizmet geçmişi, özel günler" },
    { icon: Mail, title: "Toplu Mesaj", desc: "WhatsApp onaylı şablonlarla kampanya gönderimi" },
    { icon: Languages, title: "Çok Dilli Destek", desc: "40+ dilde doğal ve akıcı iletişim" },
    { icon: PenTool, title: "Metin Düzeltme", desc: "AI ile otomatik düzeltme ve kurumsal dil çevirisi" },
];

const SECTORS = [
    { icon: Scissors, name: "Güzellik & Kuaför", usage: "Randevu yönetimi, hatırlatma, müşteri sadakati" },
    { icon: Stethoscope, name: "Klinik & Sağlık", usage: "Hasta randevusu, kontrol hatırlatma" },
    { icon: Stethoscope, name: "Diş Klinikleri", usage: "Randevu, tedavi hatırlatma, no-show azaltma" },
    { icon: Hotel, name: "Otel & Konaklama", usage: "Rezervasyon, concierge, çok dilli iletişim" },
    { icon: UtensilsCrossed, name: "Restoran & Kafe", usage: "Rezervasyon, menü bilgisi, kampanya" },
    { icon: ShoppingCart, name: "E-Ticaret", usage: "Sipariş takibi, ürün bilgisi, satış sonrası" },
    { icon: GraduationCap, name: "Eğitim", usage: "Kayıt, deneme dersi, veli iletişimi" },
    { icon: Home, name: "Emlak", usage: "İlan bilgisi, randevu, müşteri takibi" },
    { icon: Car, name: "Otomotiv", usage: "Servis hatırlatma, randevu, kampanya" },
    { icon: ShieldCheck, name: "Sigorta", usage: "Poliçe hatırlatma, teklif, hasar bildirimi" },
];

const STATS = [
    { value: "5sn", label: "Ort. AI Yanıt Süresi" },
    { value: "40+", label: "Dil Desteği" },
    { value: "%93", label: "Müşteri Memnuniyeti" },
    { value: "7/24", label: "Kesintisiz Hizmet" },
    { value: "15dk", label: "Kurulum Süresi" },
];

const VALUES = [
    { icon: Shield, title: "Şeffaflık", desc: "Gizli maliyet, gizli şart yoktur. Ne alacağınızı baştan bilirsiniz." },
    { icon: Zap, title: "Sürekli Gelişim", desc: "Yapay zeka hızla gelişiyor, biz de öyle. Ürünümüzü sürekli güncelliyoruz." },
    { icon: HeartHandshake, title: "Müşteri Odaklılık", desc: "Her özellik, gerçek işletmelerin gerçek ihtiyaçlarından doğar." },
    { icon: Globe, title: "Erişilebilirlik", desc: "AI teknolojisini tek kişilik dükkanlara bile ulaştırmayı hedefliyoruz." },
];

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-white font-sans text-slate-900">
            <LandingHeader />
            <main>
                {/* Hero */}
                <section className="bg-slate-900 text-white py-20 md:py-28">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
                            İşletmelerin Dijital İletişimini<br />
                            <span className="text-orange-500">Dönüştürüyoruz</span>
                        </h1>
                        <p className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
                            UPGUN AI olarak, yapay zeka teknolojisini işletmelerin günlük iletişim süreçlerine entegre ederek zamandan tasarruf ettiriyor, müşteri memnuniyetini artırıyor ve satış dönüşümlerini yükseltiyoruz.
                        </p>
                    </div>
                </section>

                {/* Biz Kimiz */}
                <section className="py-16 md:py-24">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold mb-4">Biz Kimiz?</h2>
                                <p className="text-slate-600 leading-relaxed mb-4">
                                    UPGUN AI, işletmelerin müşteri iletişimini yapay zeka ile güçlendirmeye odaklanan bir teknoloji şirketidir. Türkiye merkezli olarak faaliyet gösteren ekibimiz, yazılım mühendisleri, yapay zeka uzmanları ve dijital pazarlama profesyonellerinden oluşmaktadır.
                                </p>
                                <p className="text-slate-600 leading-relaxed mb-4">
                                    Temel inancımız basittir: <strong className="text-slate-900">Her işletme, büyüklüğü ne olursa olsun, profesyonel ve hızlı müşteri iletişimi sunmayı hak eder.</strong>
                                </p>
                                <p className="text-slate-600 leading-relaxed">
                                    Küçük ve orta ölçekli işletmelerin sınırlı personel, yoğun mesai saatleri ve birden fazla iletişim kanalını yönetme zorluğunu yapay zeka destekli ürünlerimizle çözüyoruz.
                                </p>
                            </div>
                            <div className="bg-gradient-to-br from-slate-50 to-orange-50 rounded-2xl p-8 border border-slate-200">
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                                            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center"><Zap className="w-4 h-4 text-orange-600" /></div>
                                            Amacımız
                                        </h3>
                                        <p className="text-slate-600 text-sm leading-relaxed ml-10">İşletmelerin müşterileriyle olan iletişim kalitesini, erişilebilirliğini ve hızını yapay zeka ile en üst düzeye çıkarmak.</p>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                                            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center"><Globe className="w-4 h-4 text-orange-600" /></div>
                                            Vizyonumuz
                                        </h3>
                                        <p className="text-slate-600 text-sm leading-relaxed ml-10">Türkiye'nin ve bölgenin lider yapay zeka destekli işletme iletişim platformu olmak. Her sektörden işletmenin dijital dönüşüm yolculuğunda güvenilir teknoloji ortağı olmak.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Neden UPGUN AI */}
                <section className="py-16 md:py-20 bg-slate-900">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-white">Neden <span className="text-orange-500">UPGUN AI</span>?</h2>
                            <p className="text-slate-400 max-w-lg mx-auto">Bizi farklı kılan 5 temel özellik</p>
                        </div>
                        <div className="grid md:grid-cols-5 gap-6">
                            {[
                                { icon: Focus, title: "Sektöre Özel", desc: "Tek kalıp değil, her sektöre özel terzi işi çözümler sunuyoruz." },
                                { icon: Brain, title: "Gerçek AI", desc: "Basit chatbot değil — doğal dil anlama, bağlam hatırlama, duygu analizi." },
                                { icon: Zap, title: "Kolay Kurulum", desc: "Teknik bilgi gerekmeden 15 dakikada kurulum. Herkes kullanabilir." },
                                { icon: Headset, title: "Yerel Destek", desc: "Türkiye merkezli ekip, Türkçe destek, sektörünüzü bilen uzmanlar." },
                                { icon: Wallet, title: "Uygun Fiyat", desc: "Küçük işletmelerin de erişebileceği fiyatlarla profesyonel AI çözümleri." },
                            ].map((item, i) => (
                                <div key={i} className="bg-white/5 rounded-xl p-5 border border-white/10 text-center hover:border-orange-500/40 hover:shadow-lg hover:shadow-orange-500/5 transition-all group">
                                    <div className="w-12 h-12 bg-orange-500/15 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-orange-500/25 transition-colors">
                                        <item.icon className="w-6 h-6 text-orange-400" />
                                    </div>
                                    <h3 className="font-bold text-sm text-white mb-1">{item.title}</h3>
                                    <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* UppyPro Ürün */}
                <section className="py-16 md:py-24">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-2xl md:text-3xl font-bold mb-3">
                                Ürünümüz: <span className="text-orange-500">Uppy</span>Pro
                            </h2>
                            <p className="text-slate-500 max-w-xl mx-auto">WhatsApp Business API ve Instagram DM'yi tek bir panelde birleştiren, yapay zeka destekli işletme iletişim platformu.</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                            {FEATURES.map((f, i) => (
                                <div key={i} className="bg-white rounded-xl p-4 md:p-6 border border-slate-200 hover:border-orange-300 hover:shadow-lg transition-all group">
                                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-orange-100 transition-colors">
                                        <f.icon className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <h3 className="font-bold text-sm text-slate-900 mb-1">{f.title}</h3>
                                    <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Sektörler */}
                <section className="py-16 md:py-20 bg-slate-900 text-white">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-2xl md:text-3xl font-bold mb-3">Hizmet Verdiğimiz Sektörler</h2>
                            <p className="text-slate-400 max-w-lg mx-auto">UppyPro, 10'dan fazla sektörde aktif olarak kullanılmaktadır.</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                            {SECTORS.map((s, i) => (
                                <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-orange-500/40 transition-all text-center">
                                    <s.icon className="w-6 h-6 text-orange-400 mx-auto mb-2" />
                                    <h3 className="font-semibold text-sm text-white mb-1">{s.name}</h3>
                                    <p className="text-[11px] text-slate-400 leading-snug">{s.usage}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Rakamlarla */}
                <section className="py-16 md:py-20">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">Rakamlarla <span className="text-orange-500">UPGUN AI</span></h2>
                        <div className="grid grid-cols-5 gap-3 md:gap-6">
                            {STATS.map((s, i) => (
                                <div key={i} className="text-center">
                                    <div className="text-2xl md:text-4xl font-black text-orange-500 mb-1">{s.value}</div>
                                    <div className="text-[10px] md:text-xs text-slate-500 font-medium">{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Değerlerimiz */}
                <section className="py-16 md:py-20 bg-slate-50">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">Değerlerimiz</h2>
                        <div className="grid md:grid-cols-4 gap-6">
                            {VALUES.map((v, i) => (
                                <div key={i} className="text-center">
                                    <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                        <v.icon className="w-6 h-6 text-orange-600" />
                                    </div>
                                    <h3 className="font-bold text-slate-900 mb-1">{v.title}</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed">{v.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="py-16 md:py-20 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h2 className="text-2xl md:text-3xl font-bold mb-4">İşletmenizin İletişimini Dönüştürmeye Hazır mısınız?</h2>
                        <p className="text-orange-100 mb-8 max-w-lg mx-auto">14 gün ücretsiz deneyin, farkı kendiniz görün. Teknik bilgi gerekmez, 15 dakikada kurulum.</p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/#pricing" className="px-8 py-3 bg-white text-orange-600 rounded-full font-semibold hover:bg-orange-50 transition-colors shadow-lg">
                                Paketleri İncele
                            </Link>
                            <Link href="/#contact" className="px-8 py-3 bg-orange-700 text-white rounded-full font-semibold hover:bg-orange-800 transition-colors border border-orange-400/30">
                                Bize Ulaşın
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
            <LandingFooter />
        </div>
    );
}
