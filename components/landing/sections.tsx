"use client";

import React from "react";

import { Check, ArrowRight, Zap, MessageSquare, Users, BarChart3, ShieldCheck, Send, Calendar, X, FileText, Reply, Wand2, Globe, Lock, MessageCircle, ChevronDown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { clsx } from "clsx";
import { useState, useActionState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { EnterpriseContactModal } from "./enterprise-contact-modal";
import { sendMeetingRequest } from "@/actions/contact-meeting";

export function FeaturesSection() {
    const [activeFeature, setActiveFeature] = useState<number | null>(0);

    useEffect(() => {
        // Mobilde tek inbox kartının başlangıçta kapalı gelmesini sağla
        if (typeof window !== "undefined" && window.innerWidth < 768) {
            setActiveFeature(null);
        }
    }, []);

    const features = [
        {
            id: 0,
            icon: <MessageSquare className="w-6 h-6 text-white" />,
            color: "bg-blue-500",
            title: "Tek Inbox",
            desc: "WhatsApp ve Instagram tek bir ekranda. Uygulamalar arasında kaybolmaya son.",
            longDesc: (
                <div className="space-y-4">
                    <h4 className="text-xl font-bold text-slate-800">Müşterileriniz Her Yerde, Siz Tek Ekranda Olun</h4>
                    <p>
                        WhatsApp Business’ta kaybolan mesajlar, Instagram DM kutusunda gözden kaçan siparişler ve sürekli uygulama değiştirmekten yorulan ekibiniz... Bu karmaşa size müşteri kaybettiriyor olabilir. Uppypro Inbox, dağınık mesaj kutularını satış odaklı bir CRM deneyimine dönüştürür.
                    </p>

                    <h5 className="text-lg font-semibold text-orange-600 mt-4">Uppypro Tek Inbox ile tanışın:</h5>
                    <ul className="space-y-2 list-disc pl-5">
                        <li><strong>Tüm Kanallar Tek Merkezde:</strong> WhatsApp ve Instagram mesajlarınızı tek bir panelde birleştirin. Artık hiçbir bildirim gözden kaçmayacak.</li>
                        <li><strong>Yapay Zeka & İnsan İş Birliği:</strong> Sıradan bir gelen kutusu değil; akıllı bir asistan. Yapay zekanız müşterileri karşılarken, siz kritik anlarda "Devral" butonuyla sohbete dahil olun.</li>
                        <li><strong>Ekip Yönetimi:</strong> Personeliniz kişisel telefonlarından değil, kurumsal panelinizden güvenle yanıt versin.</li>
                    </ul>
                    <p className="font-medium text-slate-900 border-l-4 border-orange-500 pl-4 italic">
                        Mesaj trafiğini yönetmeyi bırakın, onu satışa dönüştürmeye başlayın.
                    </p>
                </div>
            ),
            image: "/features/inbox-dashboard.png"
        },
        {
            id: 1,
            icon: <Calendar className="w-6 h-6 text-white" />,
            color: "bg-cyan-500",
            title: "Takvim Uygulaması",
            desc: "Müşteri randevularınızı kolayca planlayın ve takip edin. AI entegrasyonu ile randevuları otomatikleştirin.",
            longDesc: (
                <div className="space-y-4">
                    <h4 className="text-xl font-bold text-slate-800">Randevu Süreçlerinizi Otopilota Alın</h4>
                    <p>
                        "Ne zaman müsaitsiniz?" döngüsüne ve unutulan randevulara son verin. Uppypro Takvim, sohbeti saniyeler içinde kesinleşmiş bir randevuya dönüştürür. Siz ve ekibiniz için ayrı takvimler oluşturun, tek panelden tüm çalışanlarınızın randevularını takip edin.
                    </p>

                    <h5 className="text-lg font-semibold text-orange-600 mt-4">Neler Yapabilirsiniz?</h5>
                    <ul className="space-y-2 list-disc pl-5">
                        <li><strong>Sohbet İçinde Anında Planlama:</strong> Uygulamadan çıkmadan, müşteriyle konuşurken tek tıkla randevuyu oluşturun.</li>
                        <li><strong>Otomatik CRM Kaydı:</strong> Randevu oluşturulan her müşteri için sistem otomatik bir "Müşteri Kartı" açar ve veritabanınıza işler. Müşteri listeniz kendiliğinden büyür.</li>
                        <li><strong>Akıllı Bildirimler:</strong> Randevu kesinleştiğinde onay maili otomatik gider; böylece "gelmedi" (no-show) oranları azalır.</li>
                        <li><strong>UppyPro AI ve Kurumsal Paket Ayrıcalığı:</strong> Çoklu çalışan yönetimi ve yapay zeka asistanı ile işletmenizdeki her bir personel için ayrı takvimler oluşturun; tüm çalışanlarınız kendi randevularını kolayca takip edip yönetsin. Üstelik UppyPro AI Asistanı, gelen müşteri taleplerine göre tüm çalışanlarınızın takvimleri için 7/24 otomatik randevu oluşturur, iptal ve değişiklik süreçlerini hatasız bir şekilde sizin yerinize organize eder.</li>
                    </ul>
                </div>
            ),
            image: "/features/calendar-dashboard.png"
        },
        {
            id: 2,
            icon: <Zap className="w-6 h-6 text-white" />,
            color: "bg-orange-500",
            title: "AI Otomasyon",
            desc: "7/24 aktif yapay zeka asistanınız tüm mesajlarınıza anında yanıt versin",
            longDesc: (
                <div className="space-y-4">
                    <h4 className="text-xl font-bold text-slate-800">İşletmenizin Hiç Uyumayan En Çalışkan Personeli</h4>
                    <p>
                        Müşterileriniz saat kaçta yazarsa yazsın, onları karşılayan, tanıyan ve satışa yönlendiren bir asistanınız var. UppyPro AI ve Kurumsal paketlere özel geliştirilen Dijital Asistan, işletmenizin operasyonel yükünü sırtlar.
                    </p>

                    <h5 className="text-lg font-semibold text-orange-600 mt-4">Neler Yapar?</h5>
                    <ul className="space-y-2 list-disc pl-5">
                        <li><strong>7/24 Kesintisiz Hizmet:</strong> Siz ve ekibiniz uyurken, dijital asistanınız Instagram ve WhatsApp’tan gelen soruları saniyeler içinde yanıtlar, potansiyel müşterileri kaçırmaz.</li>
                        <li><strong>Tam Yetkili Randevu Yönetimi:</strong> Sadece boşluk doldurmaz; sizin ve ekibinizin ayrı ayrı randevularını oluşturur, değişiklik taleplerini yönetir ve iptalleri takvime işler. Hata yapmaz, çifte rezervasyona izin vermez.</li>
                        <li><strong>Satış ve CRM Uzmanı:</strong> Müşteriyle sohbet ederken iletişim bilgilerini toplar, otomatik olarak CRM’e kaydeder ve satış hunisine dahil eder.</li>
                        <li><strong>İşletmenize Özel Eğitim:</strong> Firmanızın kurallarını, fiyatlarını ve dilini öğrenir. Robotik değil, personeliniz gibi doğal konuşur.</li>
                    </ul>
                </div>
            ),
            image: "/features/ai-dashboard.png"
        },
        {
            id: 3,
            icon: <Users className="w-6 h-6 text-white" />,
            color: "bg-green-500",
            title: "Müşteri Kartı",
            desc: "Mesaj yazan tüm müşterilerinizi kolayca kaydedin, notlar alın.",
            longDesc: (
                <div className="space-y-4">
                    <h4 className="text-xl font-bold text-slate-800">Müşterinizi Tanıyın, Her Sohbeti Satışa Dönüştürün</h4>
                    <p>
                        Anonim mesajlaşmalara son verin. Uppypro, sohbet başladığı anda karşınızdaki kişinin kim olduğunu size gösterir. Otomatik konuşma özeltini çıkarır ve müşteri notlarınıza kaydeder.
                    </p>
                    <ul className="space-y-2 list-disc pl-5">
                        <li><strong>Anında Kimlik Tespiti:</strong> Mesaj geldiği an, müşteri kartını chat ekranının yanında tek tıkla oluşturun. Instagram'dan yazıyorsa, profil fotoğrafı ve adı otomatik olarak karta işlenir.</li>
                        <li><strong>Kurumsal Hafıza:</strong> "Daha önce ne almıştı?" sorusunu düşünmeyin. Müşterinin geçmiş randevularını, satın aldığı hizmetleri, aldığınız notları ve tarihleri anında görün.</li>
                        <li><strong>Otomatik Konuşma Özeti & Akıllı Notlar & Takip:</strong> Müşteriyle ilgili kritik detayları not alın. <span className="text-red-600 font-bold">"Konuşma Özeti Çıkar"</span> özelliği ile müşterileriniz ile yaptığınız görüşmeyi yapay zeka desteği ile otomatik özetini çıkarın ve isterseniz kendi notlarınızı da ekleyip kaydedin. Bir sonraki görüşmede ona ismiyle hitap edin, daha önce yapılan tüm işlemlerini görün ve ihtiyaçlarına özel öneriler sunun.</li>
                    </ul>
                </div>
            ),
            image: "/features/crm-dashboard.jpg"
        },
        {
            id: 4,
            icon: <ShieldCheck className="w-6 h-6 text-white" />,
            color: "bg-purple-500",
            title: "Devral / Devret",
            desc: "AI Asistanınız mesajları yanıtlarken istediğinizde araya girin sonra tekrar AI'ye devredin.",
            longDesc: (
                <div className="space-y-4">
                    <h4 className="text-xl font-bold text-slate-800">Kontrol Sizde, Özgürlük Yapay Zekada</h4>
                    <p>
                        Yapay zekanın hızını, insan zekasının tecrübesiyle birleştirin. UppyPro AI ve Kurumsal paketlerle sunulan "Devral/Devret" özelliği, size iletişimde sonsuz bir esneklik sunar.
                    </p>
                    <ul className="space-y-2 list-disc pl-5">
                        <li><strong>Canlı İzleme:</strong> Arkanıza yaslanın ve dijital asistanınızın müşterilerle nasıl satış odaklı konuştuğunu canlı olarak izleyin.</li>
                        <li><strong>Tek Tıkla Müdahale:</strong> Kritik bir soru mu geldi? "Devral" butonuna basarak sohbeti yapay zekadan alın, siz yanıtlayın. İşiniz bitince tekrar "Devret" diyerek asistanınıza bırakın.</li>
                        <li><strong>Esnek Çalışma Modu:</strong> İsterseniz mesai saatlerinde siz, akşamları asistanınız çalışsın; isterseniz 7/24 asistanınız yönetsin, siz sadece denetleyin.</li>
                        <li><strong>Akıllı Yönlendirme:</strong> Müşteri ısrarla bir yetkiliyle görüşmek isterse, asistanınız inatlaşmaz; iletişim bilgilerini alır, notunu düşer ve size sesli bir uyarı ile birlikte <span className="text-red-500 font-bold">"Müşteri sizi bekliyor"</span> bildirimi gönderir.</li>
                    </ul>
                </div>
            ),
            image: "/features/handover-dashboard.png"
        },
        {
            id: 5,
            icon: <MessageCircle className="w-6 h-6 text-white" />,
            color: "bg-teal-500",
            title: "WhatsApp Şablonları",
            desc: "Önceden onaylanmış şablonlar sayesinde listelerinize veya yeni müşterilere 24 saat kuralı takılmadan ulaşın.",
            longDesc: (
                <div className="space-y-4">
                    <h4 className="text-xl font-bold text-slate-800">İlk Mesajı Siz Atın, Satış Performansınızı Katlayın</h4>
                    <p>
                        WhatsApp'ın sıkı 24 Saat Kuralı'na (24H Rule) takılmayın! İşletmenizin onaylı şablonları ile yeni müşterilere ulaşabilir veya eski müşterilerinizi kampanyalardan haberdar edebilirsiniz.
                    </p>
                    <ul className="space-y-2 list-disc pl-5">
                        <li><strong>Resmi Meta Onayı:</strong> Şablonlarınız doğrudan Meta API üzerinden onaylanır, güvenli sınırların içinde risk almadan etkileşimi başlatırsınız.</li>
                        <li><strong>Kişiselleştirilmiş İletişim:</strong> Şablonlarınızı dinamik değişkenler ekleyerek müşterinin ismine veya ilgilendiği ürüne özel hâle getirin.</li>
                        <li><strong>Tek Tıkla Toplu Mesaj:</strong> Binlerce kişilik listenize tanıtım, indirim kodları veya hatırlatmalar gönderip trafiğinizi anında artırın.</li>
                    </ul>
                </div>
            ),
            image: "/features/whatsapp-templates.jpg"
        },
        {
            id: 6,
            icon: <Reply className="w-6 h-6 text-white" />,
            color: "bg-indigo-500",
            title: "Hazır Cevaplar",
            desc: "Aynı sorulara saniyeler içinde zengin içeriklerle yanıt verin, zamandan tasarruf sağlayın.",
            longDesc: (
                <div className="space-y-4">
                    <h4 className="text-xl font-bold text-slate-800">Sürekli Aynı Şeyleri Yazmaya Son Verin</h4>
                    <p>
                        "Fiyat nedir?", "Konumunuz nerede?", "İban alabilir miyim?" gibi sık sorulan soruları cevaplamak personelinizin tüm gününü almasın. Uppypro üzerinden kurguladığınız Hazır Cevaplar (Canned Responses) ile hızı ikiye katlayın.
                    </p>
                    <ul className="space-y-2 list-disc pl-5">
                        <li><strong>Zengin İçerik Desteği:</strong> Sadece metin değil, her bir hazır cevap için resim, video veya döküman tanımlayın, tek bir tuşla medyalı içerik paylaşın.</li>
                        <li><strong>Arama ve Hızlı Kullanım:</strong> Sohbet kutusunda "/" tuşuna basarak sistemdeki tüm yanıtlarınızı aratın, doğru içeriği anında gönderin.</li>
                        <li><strong>Ekip Çapında Standart:</strong> Hazır cevap listesini tüm personellerinizle paylaşın; şirketiniz için yazım, üslup ve kalite standardını güvenceye alın.</li>
                    </ul>
                </div>
            ),
            image: "/features/quick-replies_v3.jpg"
        },
        {
            id: 7,
            icon: <Wand2 className="w-6 h-6 text-white" />,
            color: "bg-pink-500",
            title: "Metin Düzeltme & İyileştirme",
            desc: "Yazdığınız kelimeleri tek bir butonla kusursuz bir kurumsal dille ve sıfır hata ile gönderin.",
            longDesc: (
                <div className="space-y-4">
                    <h4 className="text-xl font-bold text-slate-800">Profesyonelliğinizi Metinlerinizle Gösterin</h4>
                    <p>
                        Yazışırken yapılan noktalama veya harf hataları marka algınıza zarar verebilir. Bazen de aceleyle yazılmış kısa bir metin karşı tarafa soğuk görünebilir.
                        Uppypro AI'nın akıllı yazım düzenleme özelliği bütün bu riskleri ortadan kaldırıyor.
                    </p>
                    <ul className="space-y-2 list-disc pl-5">
                        <li><strong>Yazım ile Noktalama:</strong> İsterseniz yazdığınız metni kendi tarzında koruyarak sadece imla hatalarını ayıklar.</li>
                        <li><strong>Kurumsal Dile Çevir:</strong> "yarın gondeririz" yazdığınızda bunu saniyeler içinde "Siparişinizi yarın kargoya teslim etmeyi planlıyoruz, bilginize." formatına çevirir.</li>
                        <li><strong>Otomatik Önizleme:</strong> Değişikliğin anında panelinize yansıtılması sayesinde onaylayıp tek tıkla müşteriye yollayın. Zaman kazanın.</li>
                    </ul>
                </div>
            ),
            image: "/features/text-correction_v2.jpg"
        },
        {
            id: 8,
            icon: <Globe className="w-6 h-6 text-white" />,
            color: "bg-blue-500",
            title: "Her Dilde Çeviri",
            desc: "Dünyanın her yerindeki müşterilerinizle, onların dilinden konuşarak sınırları kaldırın.",
            longDesc: (
                <div className="space-y-4">
                    <h4 className="text-xl font-bold text-slate-800">Tüm Dünya Müşteriniz Olabilir</h4>
                    <p>
                        Yabancı müşterilerle iletişim kurmak hiç bu kadar kolay olmamıştı. Uppypro AI, globalleşen pazarınızda dil bariyerini tamamen ortadan kaldırır.
                        Hem gelen mesajları anlar, hem de sizin cevaplarınızı karşı tarafın dilinde kusursuzca iletir.
                    </p>
                    <ul className="space-y-2 list-disc pl-5">
                        <li><strong>Akıllı Dil Algılama:</strong> Müşterinizin hangi dilde yazdığını saniyeler içinde anlar ve size Türkçe tercümesi ile birlikte gösterir.</li>
                        <li><strong>Tek Tıkla Karşı Dilde Yanıt:</strong> Kendi dilinizde cevabınızı yazın, menüden müşterinin dilini seçin; sistem anında o dildeki profesyonel karşılığını göndersin.</li>
                        <li><strong>Evrensel Satış Gücü:</strong> İspanyolca, Fransızca, Arapça, Rusça fark etmeksizin; işletmenizi anında uluslararası müşteri kabul edebilir hâle getirin.</li>
                    </ul>
                </div>
            ),
            image: "/features/translation.jpg"
        },
        {
            id: 9,
            icon: <Lock className="w-6 h-6 text-white" />,
            color: "bg-slate-700",
            title: "Güvenlik",
            desc: "Uçtan uça koruma, anti-spam kontrolü ve akıllı aktivite takibi ile sızmalara karşı korunun.",
            longDesc: (
                <div className="space-y-4">
                    <h4 className="text-xl font-bold text-slate-800">Hesabınızın Güvenliği En Üst Seviyede</h4>
                    <p>
                        Şirket verileriniz ve müşteri iletişiminiz paha biçilmezdir. Uppypro'nun sunduğu kurumsal düzey güvenlik altyapısı sayesinde gözünüz arkada kalmaz. Yüksek trafikli WhatsApp hatlarında spam saldırılarını filtrelemek, sadece ilk adımımızdır.
                    </p>
                    <ul className="space-y-2 list-disc pl-5">
                        <li><strong>Bot Savunması (Anti-Spam):</strong> Sahte numaralardan gelen spam ve bot saldırılarını yapay zeka sayesinde anında durdurur. Hesabınızın kalitesini (quality rating) düşmekten korur.</li>
                        <li><strong>Akıllı Aktivite Takibi:</strong> Müşterileriniz ile temsilcileriniz arasındaki diyaloglarda gerçekleşebilecek anomali, küfür veya KVKK (kişisel veri) ihlallerini analiz eder ve yöneticilere sinyal çakar.</li>
                        <li><strong>Kurumsal Uçtan Uca Koruma:</strong> Sunucularımızda saklanan tüm müşteri yazılı ve görsel medya diyalogları, şifrelenmiş katmanlar arkasında tutularak dışarıdan yetkisiz erişimi tamamen imkansız kılar.</li>
                    </ul>
                </div>
            ),
            image: "/features/security.jpg"
        }
    ];

    return (
        <section id="features" className="py-12 md:py-24 bg-slate-50 scroll-mt-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-5xl font-bold text-slate-900 mb-2">Özellikler</h2>
                    <h3 className="text-2xl font-bold text-orange-500 mb-4">Mesaj Yönetimini Satışa Çevirin</h3>
                    <p className="text-slate-500">
                        Karmaşık panellere ve excel tablolarına veda edin. UppyPro ile müşteri iletişimi hiç bu kadar kolay olmamıştı.
                    </p>
                </div>
                {/* Mobile Grid - 9 features (excluding Güvenlik), 3 per row, square cards */}
                <div className="md:hidden grid grid-cols-3 gap-2">
                    {features.slice(0, 9).map((f, i) => {
                        const isActive = activeFeature === f.id;
                        const mobileRowEnd = (i + 1) % 3 === 0;
                        const rowStart = Math.floor(i / 3) * 3;
                        const rowEnd = rowStart + 2;
                        const activeInThisRow = activeFeature !== null
                            && features.slice(0, 9).findIndex(feat => feat.id === activeFeature) >= rowStart
                            && features.slice(0, 9).findIndex(feat => feat.id === activeFeature) <= rowEnd;

                        return (
                            <React.Fragment key={f.id}>
                                <motion.div
                                    onClick={() => setActiveFeature(isActive ? null : f.id)}
                                    className={clsx(
                                        "cursor-pointer p-2 rounded-xl border text-center flex flex-col items-center justify-center aspect-square transition-all",
                                        isActive
                                            ? "bg-white shadow-lg ring-2 ring-orange-400 border-orange-200"
                                            : "bg-white shadow-sm border-slate-100"
                                    )}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <div className={clsx("w-9 h-9 rounded-lg flex items-center justify-center mb-1.5 shadow-md", f.color)}>
                                        {f.icon}
                                    </div>
                                    <h3 className={clsx("text-[10px] font-bold leading-tight", isActive ? "text-orange-600" : "text-slate-800")}>
                                        {f.title}
                                    </h3>
                                </motion.div>

                                {mobileRowEnd && activeInThisRow && activeFeature !== null && (
                                    <div className="col-span-3">
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={`mobile-detail-${activeFeature}`}
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden mt-2 mb-1">
                                                    <div className="bg-slate-50 p-4 flex items-center justify-center border-b border-slate-100">
                                                        <img
                                                            src={features[activeFeature].image}
                                                            alt={features[activeFeature].title}
                                                            className="rounded-xl shadow-md max-h-[180px] w-auto object-contain"
                                                        />
                                                    </div>
                                                    <div className="p-4">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <div className={clsx("w-7 h-7 rounded-lg flex items-center justify-center shadow-md", features[activeFeature].color)}>
                                                                {features[activeFeature].icon}
                                                            </div>
                                                            <h3 className="text-base font-bold text-slate-900">
                                                                {features[activeFeature].title}
                                                            </h3>
                                                        </div>
                                                        <div className="text-slate-600 text-xs leading-relaxed">
                                                            {features[activeFeature].longDesc}
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </AnimatePresence>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* ROW 1 (0-4) - Desktop Only */}
                <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {features.slice(0, 5).map((f, i) => {
                        const originalIndex = i;
                        // Determine if we need to show mobile detail after this card
                        // Cards per row on mobile = 3, so rows break after index 2
                        const mobileRowEnd = (i === 2) || (i === 4); // end of mobile row
                        const isActive = activeFeature === originalIndex;
                        // Check if any card in this mobile row is active
                        const mobileRow = i <= 2 ? 0 : 1;
                        const activeInThisRow = mobileRow === 0
                            ? (activeFeature !== null && activeFeature >= 0 && activeFeature <= 2)
                            : (activeFeature !== null && activeFeature >= 3 && activeFeature <= 4);
                        const activeFeatureInRow = mobileRow === 0
                            ? activeFeature
                            : activeFeature;

                        return (
                            <React.Fragment key={originalIndex}>
                                {/* Desktop card (hidden on mobile) */}
                                <div className="hidden md:block">
                                    <motion.div
                                        onClick={() => setActiveFeature(isActive ? null : originalIndex)}
                                        animate={{
                                            scale: isActive ? 1.05 : 1,
                                            borderColor: isActive ? "rgb(251 146 60)" : "rgb(241 245 249)",
                                            zIndex: isActive ? 10 : 0
                                        }}
                                        whileHover={{
                                            x: [0, -5, 5, -5, 5, 0],
                                            transition: { duration: 0.5 }
                                        }}
                                        className={clsx(
                                            "cursor-pointer p-6 rounded-2xl border relative group text-center flex flex-col items-center h-full",
                                            isActive
                                                ? "bg-white shadow-xl ring-2 ring-orange-500 ring-offset-2"
                                                : "bg-white shadow-sm hover:shadow-md hover:border-orange-100"
                                        )}
                                    >
                                        <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg transition-transform duration-300", f.color, isActive ? "scale-110" : "group-hover:scale-105")}>
                                            {f.icon}
                                        </div>
                                        <h3 className={clsx("text-lg font-bold mb-2", isActive ? "text-orange-600" : "text-slate-900")}>
                                            {f.title}
                                        </h3>
                                        <p className="text-slate-500 text-xs leading-relaxed">
                                            {f.desc}
                                        </p>
                                        {isActive && (
                                            <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-white border-r border-b border-orange-200 rotate-45 z-20"></div>
                                        )}
                                    </motion.div>
                                </div>

                                {/* Mobile card (hidden on desktop) */}
                                <motion.div
                                    onClick={() => setActiveFeature(isActive ? null : originalIndex)}
                                    className={clsx(
                                        "md:hidden cursor-pointer p-2 rounded-xl border text-center flex flex-col items-center transition-all",
                                        isActive
                                            ? "bg-white shadow-lg ring-2 ring-orange-400 border-orange-200"
                                            : "bg-white shadow-sm border-slate-100 active:scale-95"
                                    )}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 shadow-md", f.color)}>
                                        {f.icon}
                                    </div>
                                    <h3 className={clsx("text-[10px] font-bold leading-tight", isActive ? "text-orange-600" : "text-slate-800")}>
                                        {f.title}
                                    </h3>
                                </motion.div>

                                {/* Mobile detail panel - after end of mobile row */}
                                {mobileRowEnd && activeInThisRow && activeFeature !== null && activeFeature <= 4 && (
                                    <div className="md:hidden col-span-3">
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={`mobile-detail-${activeFeature}`}
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden mt-2 mb-1">
                                                    <div className="bg-slate-50 p-4 flex items-center justify-center border-b border-slate-100">
                                                        <img
                                                            src={features[activeFeature].image}
                                                            alt={features[activeFeature].title}
                                                            className="rounded-xl shadow-md max-h-[180px] w-auto object-contain"
                                                        />
                                                    </div>
                                                    <div className="p-4">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <div className={clsx("w-7 h-7 rounded-lg flex items-center justify-center shadow-md", features[activeFeature].color)}>
                                                                {features[activeFeature].icon}
                                                            </div>
                                                            <h3 className="text-base font-bold text-slate-900">
                                                                {features[activeFeature].title}
                                                            </h3>
                                                        </div>
                                                        <div className="text-slate-600 text-xs leading-relaxed">
                                                            {features[activeFeature].longDesc}
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </AnimatePresence>
                                    </div>
                                )}
                            </React.Fragment>
                        )
                    })}
                </div>

                {/* Shared Detail Panel (Desktop Only) for ROW 1 */}
                <div className="hidden md:block">
                    <AnimatePresence mode="wait">
                        {activeFeature !== null && activeFeature >= 0 && activeFeature <= 4 && (
                            <motion.div
                                key="detail-panel-1"
                                initial={{ opacity: 0, y: -20, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: "auto" }}
                                exit={{ opacity: 0, y: -20, height: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="overflow-hidden mt-8 mb-8"
                            >
                                <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                                    <div className="grid lg:grid-cols-2 gap-0">
                                        {/* Image Section */}
                                        <div className="bg-slate-50 p-8 flex items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-100">
                                            <motion.img
                                                key={features[activeFeature].image}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ duration: 0.4, delay: 0.1 }}
                                                src={features[activeFeature].image}
                                                alt={features[activeFeature].title}
                                                className="rounded-xl shadow-lg max-h-[360px] w-auto object-contain"
                                            />
                                        </div>

                                        {/* Content Section */}
                                        <div className="p-8 lg:p-12 flex flex-col justify-center">
                                            <motion.div
                                                key={features[activeFeature].title}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ duration: 0.4, delay: 0.2 }}
                                            >
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center shadow-md", features[activeFeature].color)}>
                                                        {features[activeFeature].icon}
                                                    </div>
                                                    <h3 className="text-2xl font-bold text-slate-900">
                                                        {features[activeFeature].title}
                                                    </h3>
                                                </div>

                                                <div className="text-slate-600 text-lg leading-relaxed mb-8">
                                                    {features[activeFeature].longDesc}
                                                </div>

                                                <button
                                                    onClick={() => setActiveFeature(null)}
                                                    className="text-sm font-bold text-slate-400 hover:text-orange-600 flex items-center gap-2 transition-colors"
                                                >
                                                    Kapat <span className="text-xs">✕</span>
                                                </button>
                                            </motion.div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>


                {/* ROW 2 (5-9) - Desktop Only */}
                <div className={clsx("hidden md:grid md:grid-cols-2 lg:grid-cols-5 gap-4", (activeFeature === null || activeFeature > 4) ? "mt-4" : "mt-8")}>
                    {features.slice(5, 10).map((f, i) => {
                        const originalIndex = i + 5;
                        const mobileRowEnd = (i === 2) || (i === 4);
                        const isActive = activeFeature === originalIndex;
                        const mobileRow = i <= 2 ? 0 : 1;
                        const activeInThisRow = mobileRow === 0
                            ? (activeFeature !== null && activeFeature >= 5 && activeFeature <= 7)
                            : (activeFeature !== null && activeFeature >= 8 && activeFeature <= 9);

                        return (
                            <React.Fragment key={originalIndex}>
                                {/* Desktop card */}
                                <div className="hidden md:block">
                                    <motion.div
                                        onClick={() => setActiveFeature(isActive ? null : originalIndex)}
                                        animate={{
                                            scale: isActive ? 1.05 : 1,
                                            borderColor: isActive ? "rgb(251 146 60)" : "rgb(241 245 249)",
                                            zIndex: isActive ? 10 : 0
                                        }}
                                        whileHover={{
                                            x: [0, -5, 5, -5, 5, 0],
                                            transition: { duration: 0.5 }
                                        }}
                                        className={clsx(
                                            "cursor-pointer p-6 rounded-2xl border relative group text-center flex flex-col items-center h-full",
                                            isActive
                                                ? "bg-white shadow-xl ring-2 ring-orange-500 ring-offset-2"
                                                : "bg-white shadow-sm hover:shadow-md hover:border-orange-100"
                                        )}
                                    >
                                        <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg transition-transform duration-300", f.color, isActive ? "scale-110" : "group-hover:scale-105")}>
                                            {f.icon}
                                        </div>
                                        <h3 className={clsx("text-lg font-bold mb-2", isActive ? "text-orange-600" : "text-slate-900")}>
                                            {f.title}
                                        </h3>
                                        <p className="text-slate-500 text-xs leading-relaxed">
                                            {f.desc}
                                        </p>
                                        {isActive && (
                                            <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-white border-r border-b border-orange-200 rotate-45 z-20"></div>
                                        )}
                                    </motion.div>
                                </div>

                                {/* Mobile card */}
                                <motion.div
                                    onClick={() => setActiveFeature(isActive ? null : originalIndex)}
                                    className={clsx(
                                        "md:hidden cursor-pointer p-2 rounded-xl border text-center flex flex-col items-center transition-all",
                                        isActive
                                            ? "bg-white shadow-lg ring-2 ring-orange-400 border-orange-200"
                                            : "bg-white shadow-sm border-slate-100 active:scale-95"
                                    )}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 shadow-md", f.color)}>
                                        {f.icon}
                                    </div>
                                    <h3 className={clsx("text-[10px] font-bold leading-tight", isActive ? "text-orange-600" : "text-slate-800")}>
                                        {f.title}
                                    </h3>
                                </motion.div>

                                {/* Mobile detail panel */}
                                {mobileRowEnd && activeInThisRow && activeFeature !== null && activeFeature >= 5 && (
                                    <div className="md:hidden col-span-3">
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={`mobile-detail-r2-${activeFeature}`}
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden mt-2 mb-1">
                                                    <div className="bg-slate-50 p-4 flex items-center justify-center border-b border-slate-100">
                                                        <img
                                                            src={features[activeFeature].image}
                                                            alt={features[activeFeature].title}
                                                            className="rounded-xl shadow-md max-h-[180px] w-auto object-contain"
                                                        />
                                                    </div>
                                                    <div className="p-4">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <div className={clsx("w-7 h-7 rounded-lg flex items-center justify-center shadow-md", features[activeFeature].color)}>
                                                                {features[activeFeature].icon}
                                                            </div>
                                                            <h3 className="text-base font-bold text-slate-900">
                                                                {features[activeFeature].title}
                                                            </h3>
                                                        </div>
                                                        <div className="text-slate-600 text-xs leading-relaxed">
                                                            {features[activeFeature].longDesc}
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </AnimatePresence>
                                    </div>
                                )}
                            </React.Fragment>
                        )
                    })}
                </div>

                {/* Shared Detail Panel (Desktop Only) for ROW 2 */}
                <div className="hidden md:block">
                    <AnimatePresence mode="wait">
                        {activeFeature !== null && activeFeature >= 5 && activeFeature <= 9 && (
                            <motion.div
                                key="detail-panel-2"
                                initial={{ opacity: 0, y: -20, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: "auto" }}
                                exit={{ opacity: 0, y: -20, height: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="overflow-hidden mt-8"
                            >
                                <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                                    <div className="grid lg:grid-cols-2 gap-0">
                                        {/* Image Section */}
                                        <div className="bg-slate-50 p-8 flex items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-100">
                                            <motion.img
                                                key={features[activeFeature].image}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ duration: 0.4, delay: 0.1 }}
                                                src={features[activeFeature].image}
                                                alt={features[activeFeature].title}
                                                className="rounded-xl shadow-lg max-h-[360px] w-auto object-contain"
                                            />
                                        </div>

                                        {/* Content Section */}
                                        <div className="p-8 lg:p-12 flex flex-col justify-center">
                                            <motion.div
                                                key={features[activeFeature].title}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ duration: 0.4, delay: 0.2 }}
                                            >
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center shadow-md", features[activeFeature].color)}>
                                                        {features[activeFeature].icon}
                                                    </div>
                                                    <h3 className="text-2xl font-bold text-slate-900">
                                                        {features[activeFeature].title}
                                                    </h3>
                                                </div>

                                                <div className="text-slate-600 text-lg leading-relaxed mb-8">
                                                    {features[activeFeature].longDesc}
                                                </div>

                                                <button
                                                    onClick={() => setActiveFeature(null)}
                                                    className="text-sm font-bold text-slate-400 hover:text-orange-600 flex items-center gap-2 transition-colors"
                                                >
                                                    Kapat <span className="text-xs">✕</span>
                                                </button>
                                            </motion.div>
                                        </div>
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

export function PricingSection({ inboxPrice, aiPrice }: { inboxPrice?: number, aiPrice?: number }) {
    // Default values if not provided (fallback)
    const inboxPriceVal = inboxPrice || 19;
    const aiPriceVal = aiPrice || 79;
    const [isEnterpriseModalOpen, setIsEnterpriseModalOpen] = useState(false);
    const [inboxExpanded, setInboxExpanded] = useState(false);

    const formatPrice = (p: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(p);

    return (
        <section id="pricing" className="py-12 md:py-24 bg-white relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-orange-50/50 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-4xl font-bold text-slate-900 mb-4">İşletmenize Uygun Paketi Seçin</h2>
                    <p className="text-slate-500 text-lg">
                        Taahhüt yok, gizli ücret yok. Büyüdükçe paketinizi yükseltin.
                    </p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8 max-w-6xl mx-auto items-start">
                    {/* Basic Plan */}
                    <div className="bg-gradient-to-br from-green-500 to-blue-900 p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-lg hover:shadow-xl hover:scale-105 duration-300 transition-all relative group text-white">
                        <h3 className="text-sm md:text-xl font-bold text-white mb-1 md:mb-2">UppyPro Inbox</h3>
                        <p className="text-slate-100 text-[10px] md:text-sm mb-3 md:mb-6">Küçük işletmeler ve butikler için.</p>
                        <div className="flex items-baseline gap-1 mb-3 md:mb-6">
                            <span className="text-xl md:text-4xl font-extrabold text-white">{formatPrice(inboxPriceVal)}</span>
                            <span className="text-slate-200 text-[9px] md:text-sm ml-0.5 md:ml-1">+ KDV / ay</span>
                        </div>
                        <Link href="/uyelik?plan=base">
                            <Button className="w-full h-8 md:h-12 rounded-lg md:rounded-xl mb-4 md:mb-8 bg-white text-slate-900 text-xs md:text-sm font-bold hover:bg-slate-50 hover:text-green-600 transition-colors border-0">
                                Paketi Seç
                            </Button>
                        </Link>
                        <ul className="space-y-2 md:space-y-4 text-[10px] md:text-sm text-slate-100">
                            <li className="flex items-center gap-1.5 md:gap-3"><Check className="w-3.5 h-3.5 md:w-5 md:h-5 text-white flex-shrink-0" /> Instagram + WhatsApp</li>
                            <li className="flex items-center gap-1.5 md:gap-3"><Check className="w-3.5 h-3.5 md:w-5 md:h-5 text-white flex-shrink-0" /> Tek Inbox Yönetimi</li>
                            <li className="flex items-center gap-1.5 md:gap-3"><Check className="w-3.5 h-3.5 md:w-5 md:h-5 text-white flex-shrink-0" /> CRM/ Müşteri Kartı</li>
                            <li className="flex items-center gap-1.5 md:gap-3"><Check className="w-3.5 h-3.5 md:w-5 md:h-5 text-white flex-shrink-0" /> Görüşme Özeti</li>
                            <li className="flex items-center gap-1.5 md:gap-3"><Check className="w-3.5 h-3.5 md:w-5 md:h-5 text-white flex-shrink-0" /> Takvim (1-10 personel)</li>
                        </ul>

                        {/* Expandable section */}
                        <AnimatePresence>
                            {inboxExpanded && (
                                <motion.ul
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    className="space-y-2 md:space-y-4 text-[10px] md:text-sm text-slate-100 overflow-hidden mt-2 md:mt-4"
                                >
                                    <li className="flex items-center gap-1.5 md:gap-3"><Check className="w-3.5 h-3.5 md:w-5 md:h-5 text-white flex-shrink-0" /> WA Şablon Yönetimi</li>
                                    <li className="flex items-center gap-1.5 md:gap-3"><Check className="w-3.5 h-3.5 md:w-5 md:h-5 text-white flex-shrink-0" /> Hazır Cevaplar</li>
                                    <li className="flex items-center gap-1.5 md:gap-3"><Check className="w-3.5 h-3.5 md:w-5 md:h-5 text-white flex-shrink-0" /> Metin Düzeltme</li>
                                    <li className="flex items-center gap-1.5 md:gap-3"><Check className="w-3.5 h-3.5 md:w-5 md:h-5 text-white flex-shrink-0" /> Her Dilde Çeviri</li>
                                    <li className="flex items-center gap-1.5 md:gap-3 text-slate-300"><X className="w-3.5 h-3.5 md:w-5 md:h-5 text-red-500 flex-shrink-0" /> AI Asistan</li>
                                </motion.ul>
                            )}
                        </AnimatePresence>

                        <button
                            onClick={() => setInboxExpanded(!inboxExpanded)}
                            className="flex items-center gap-2 mt-4 text-xs font-semibold text-white/80 hover:text-white transition-colors mx-auto cursor-pointer"
                        >
                            {inboxExpanded ? "Gizle" : "Devamını oku..."}
                            <motion.span
                                animate={{ y: inboxExpanded ? 0 : [0, 4, 0] }}
                                transition={inboxExpanded ? {} : { repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                            >
                                <ChevronDown className={clsx("w-4 h-4 transition-transform duration-300", inboxExpanded && "rotate-180")} />
                            </motion.span>
                        </button>
                    </div>

                    {/* AI Plan (Highlighted) */}
                    <div className="bg-slate-900 p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-2xl ring-2 md:ring-4 ring-orange-500/20 relative transform lg:-translate-y-4 hover:scale-105 duration-300 transition-all">
                        <div className="absolute top-0 right-0 left-0 -mt-3 md:-mt-4 flex justify-center">
                            <span className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2 md:px-4 py-0.5 md:py-1 rounded-full text-[8px] md:text-xs font-bold uppercase tracking-wide shadow-lg">
                                En Çok Tercih Edilen
                            </span>
                        </div>
                        <h3 className="text-sm md:text-xl font-bold text-white mb-1 md:mb-2">UppyPro AI</h3>
                        <p className="text-slate-400 text-[10px] md:text-sm mb-3 md:mb-6">Otomasyon isteyen markalar.</p>
                        <div className="flex items-baseline gap-1 mb-3 md:mb-6">
                            <span className="text-xl md:text-5xl font-extrabold text-white">{formatPrice(aiPriceVal)}</span>
                            <span className="text-slate-500 text-[9px] md:text-sm ml-0.5 md:ml-1">+ KDV / ay</span>
                        </div>
                        <Link href="/uyelik?plan=ai_starter">
                            <Button className="w-full h-8 md:h-12 rounded-lg md:rounded-xl mb-4 md:mb-8 bg-orange-600 hover:bg-orange-700 text-white text-xs md:text-sm font-bold shadow-lg shadow-orange-500/25">
                                AI Paketi Seç
                            </Button>
                        </Link>
                        <ul className="space-y-2 md:space-y-4 text-[10px] md:text-sm text-slate-300">
                            <li className="flex items-center gap-1.5 md:gap-3"><Check className="w-3.5 h-3.5 md:w-5 md:h-5 text-orange-500 flex-shrink-0" /> <span className="text-white font-medium">Inbox Paketi Dahil</span></li>
                            <li className="flex items-center gap-1.5 md:gap-3"><Check className="w-3.5 h-3.5 md:w-5 md:h-5 text-orange-500 flex-shrink-0" /> <span className="text-white font-medium">AI Asistan</span></li>
                            <li className="flex items-center gap-1.5 md:gap-3"><Check className="w-3.5 h-3.5 md:w-5 md:h-5 text-orange-500 flex-shrink-0" /> AI Takvim</li>
                            <li className="flex items-center gap-1.5 md:gap-3"><Check className="w-3.5 h-3.5 md:w-5 md:h-5 text-orange-500 flex-shrink-0" /> AI CRM</li>
                            <li className="flex items-center gap-1.5 md:gap-3"><Check className="w-3.5 h-3.5 md:w-5 md:h-5 text-orange-500 flex-shrink-0" /> 7/24 Yanıt</li>
                            <li className="flex items-center gap-1.5 md:gap-3"><Check className="w-3.5 h-3.5 md:w-5 md:h-5 text-orange-500 flex-shrink-0" /> Devral / Devret</li>
                        </ul>
                    </div>

                    {/* Enterprise Plan */}
                    <div className="col-span-2 lg:col-span-1 max-w-[280px] md:max-w-none mx-auto w-full bg-gradient-to-br from-purple-700 to-indigo-900 p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-lg hover:shadow-xl hover:scale-105 duration-300 transition-all relative group text-white">
                        <h3 className="text-sm md:text-xl font-bold text-white mb-1 md:mb-2">UppyPro Kurumsal</h3>
                        <p className="text-slate-200 text-[10px] md:text-sm mb-3 md:mb-6">Özel çözümler ve yüksek hacimler.</p>
                        <div className="flex items-baseline gap-1 mb-3 md:mb-6">
                            <span className="text-xl md:text-3xl font-bold text-white">Teklif Al</span>
                        </div>
                        <Button onClick={() => setIsEnterpriseModalOpen(true)} className="w-full h-8 md:h-12 rounded-lg md:rounded-xl mb-4 md:mb-8 bg-white text-slate-900 text-xs md:text-sm font-bold hover:bg-slate-50 hover:text-purple-700 transition-colors border-0">
                            İletişime Geç
                        </Button>
                        <ul className="space-y-2 md:space-y-4 text-[10px] md:text-sm text-slate-200">
                            <li className="flex items-center gap-1.5 md:gap-3"><Check className="w-3.5 h-3.5 md:w-5 md:h-5 text-white flex-shrink-0" /> <span className="font-medium">AI Paketi Dahil</span></li>
                            <li className="flex items-start gap-1.5 md:gap-3"><Check className="w-3.5 h-3.5 md:w-5 md:h-5 text-white flex-shrink-0 mt-0.5" /> <span>Özel otomasyon hizmetleri</span></li>
                        </ul>
                    </div>
                </div>

                <p className="mt-12 text-center text-sm text-slate-400">
                    * Tüm fiyatlara KDV eklenecektir. Kurumsal paketler için teklif iletilecektir.
                </p>
            </div>
            <EnterpriseContactModal open={isEnterpriseModalOpen} onOpenChange={setIsEnterpriseModalOpen} />
        </section >
    );
}

export function HowItWorks() {
    return (
        <section className="py-8 bg-white border-b border-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-4">
                        <span className="text-orange-500">Uppy</span>
                        <span className="text-black">Pro</span>
                    </h1>
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
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const [state, formAction, isPending] = useActionState(sendMeetingRequest, {});
    const fileInputRef = useRef<HTMLFormElement>(null);

    // Reset form on success
    if (state.success && fileInputRef.current) {
        fileInputRef.current.reset();
    }

    return (
        <section id="contact" className="py-12 md:py-24 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                        {state.success ? (
                            <div className="text-center py-12 space-y-4">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                    <Check className="w-8 h-8 text-green-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900">Talebiniz Alındı!</h3>
                                <p className="text-slate-500">
                                    Bilgileriniz bize ulaştı. En kısa sürede sizinle iletişime geçeceğiz.
                                </p>
                                <Button
                                    onClick={() => window.location.reload()}
                                    className="mt-4 bg-orange-600 hover:bg-orange-700 text-white"
                                >
                                    Yeni Form Doldur
                                </Button>
                            </div>
                        ) : (
                            <form action={formAction} ref={fileInputRef} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Ad Soyad *</label>
                                    <input name="fullName" type="text" placeholder="Örn: Ahmet Yılmaz" required className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
                                    {state.errors?.fullName && <p className="text-xs text-red-500">{state.errors.fullName[0]}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Firma Adı</label>
                                    <input name="companyName" type="text" placeholder="Örn: XYZ Teknoloji" className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
                                    {state.errors?.companyName && <p className="text-xs text-red-500">{state.errors.companyName[0]}</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">E-posta *</label>
                                        <input name="email" type="email" placeholder="ornek@email.com" required className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
                                        {state.errors?.email && <p className="text-xs text-red-500">{state.errors.email[0]}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Telefon *</label>
                                        <input name="phone" type="tel" placeholder="+90 555 123 45 67" required className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
                                        {state.errors?.phone && <p className="text-xs text-red-500">{state.errors.phone[0]}</p>}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Şu an en çok zorlandığınız süreç nedir? *</label>
                                    <textarea name="description" placeholder="Örn: Müşteri mesajlarına geç cevap veriyoruz ve randevu yönetimi çok vakit alıyor..." required className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
                                    {state.errors?.description && <p className="text-xs text-red-500">{state.errors.description[0]}</p>}
                                </div>

                                {state.error && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                                        {state.error}
                                    </div>
                                )}

                                <Button disabled={isPending} type="submit" className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20">
                                    {isPending ? (
                                        <>Gönderiliyor...</>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4 mr-2" />
                                            Görüşme Talep Et
                                        </>
                                    )}
                                </Button>
                            </form>
                        )}

                        <div className="pt-4 text-center space-y-3">
                            <p className="text-xs text-slate-400">Dilerseniz direkt WhatsApp üzerinden de yazabilirsiniz.</p>
                            <Button asChild variant="outline" className="w-full border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700 font-bold h-10 rounded-xl cursor-pointer">
                                <Link href="https://wa.me/905334906252" target="_blank">
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    WhatsApp'tan Yaz
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
