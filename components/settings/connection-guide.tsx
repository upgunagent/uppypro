"use client";

import { useState, useCallback } from "react";
import { ChevronDown, MessageCircle, Instagram, AlertTriangle, CheckCircle2, Info, X, ZoomIn } from "lucide-react";
import { clsx } from "clsx";

interface GuideStep {
    title: string;
    description: string;
    image: string;
    tips?: string[];
    warning?: string;
}

const whatsappSteps: GuideStep[] = [
    {
        title: "\"WhatsApp'ı Bağla\" Butonuna Tıklayın",
        description: "İşletme Ayarları > Bağlantılar > İletişim Kanalları sekmesindeki yeşil WhatsApp kartında bulunan \"WhatsApp'ı Bağla\" butonuna tıklayın. Bu işlem Meta'nın Embedded Signup sihirbazını başlatacaktır.",
        image: "/guide/wa_step1_button_1773262436086.png",
        tips: [
            "Tarayıcınızda popup engelleyici varsa geçici olarak kapatın",
            "Google Chrome veya Firefox tarayıcıları önerilir"
        ]
    },
    {
        title: "Facebook ile Giriş Yapın",
        description: "Meta'nın açılan penceresiinde Facebook hesabınızla giriş yapın. İşletmenizin Facebook sayfasını yönetme yetkisi olan hesabı kullanmanız gerekir.",
        image: "/guide/wa_step2_fblogin_1773262453211.png",
        tips: [
            "İşletmenizin Facebook sayfasının yöneticisi olan hesapla giriş yapın",
            "İki faktörlü doğrulama açıksa telefonunuzu hazır bulundurun"
        ]
    },
    {
        title: "Gerekli İzinleri Onaylayın",
        description: "UppyPro'nun WhatsApp Business hesabınıza erişebilmesi için gerekli izinleri onaylayın. Bu izinler mesaj gönderme/alma ve hesap yönetimi için gereklidir.",
        image: "/guide/wa_step3_permissions_1773262468020.png",
        warning: "Tüm izinleri onaylamazsanız bağlantı düzgün çalışmayabilir. Lütfen istenen tüm izinlere onay verin."
    },
    {
        title: "İşletme Portföyünüzü Seçin veya Oluşturun",
        description: "Meta Business Portföyü (Business Portfolio), işletmenize ait tüm Meta varlıklarını bir arada tutan yapıdır. Mevcut portföyünüzü seçin veya yeni bir portföy oluşturun.",
        image: "/guide/wa_step4_portfolio_1773262508370.png",
        tips: [
            "Zaten bir Meta Business hesabınız varsa mevcut portföyü seçin",
            "Yeni oluşturuyorsanız işletme adınızı doğru girin"
        ]
    },
    {
        title: "WhatsApp Business Hesabı Seçin veya Oluşturun",
        description: "Mevcut bir WhatsApp Business Account (WABA) varsa onu seçin. Yoksa yeni bir WABA oluşturun. Her portföyde birden fazla WABA olabilir.",
        image: "/guide/wa_step5_waba_1773262523048.png"
    },
    {
        title: "Telefon Numaranızı Ekleyin ve Doğrulayın",
        description: "WhatsApp Business için kullanacağınız telefon numarasını girin. Meta, bu numaraya SMS veya sesli arama ile bir doğrulama kodu gönderecektir. Gelen 6 haneli kodu ilgili alana yazın.",
        image: "/guide/wa_step6_phone_1773262539561.png",
        warning: "Bu numara daha önce kişisel WhatsApp uygulamasında kullanılıyorsa, kişisel hesabınız devre dışı kalabilir. İşletme için ayrı bir hat kullanmanızı öneririz.",
        tips: [
            "Ülke kodunun doğru seçildiğinden emin olun (+90 Türkiye)",
            "SMS gelmezse 'Sesli Arama' seçeneğini deneyin"
        ]
    },
    {
        title: "Profil Adınızı Belirleyin",
        description: "WhatsApp Business profilinizde müşterilerinizin göreceği işletme adını girin. Bu isim, mesajlarınızda ve işletme profilinizde görünecektir.",
        image: "/guide/wa_step7_profile_1773262580581.png",
        tips: [
            "İşletme adınızı tam ve profesyonel şekilde yazın",
            "Meta, uygunsuz veya yanıltıcı isimleri reddedebilir"
        ]
    },
    {
        title: "Bağlantı Tamamlandı! 🎉",
        description: "Tebrikler! WhatsApp Business hesabınız başarıyla UppyPro'ya bağlandı. Artık müşterilerinizden gelen WhatsApp mesajlarını panelinizden görebilir ve yanıtlayabilirsiniz.",
        image: "/guide/wa_step8_success_1773262592983.png"
    }
];

const instagramSteps: GuideStep[] = [
    {
        title: "\"Instagram ile Bağlan\" Butonuna Tıklayın",
        description: "İşletme Ayarları > Bağlantılar > İletişim Kanalları sekmesindeki kırmızı Instagram kartında bulunan \"Instagram ile Bağlan\" butonuna tıklayın. Bu işlem Instagram OAuth oturum açma penceresini açacaktır.",
        image: "/guide/ig_step1_button_1773262608891.png",
        warning: "Başlamadan önce Instagram hesabınızın İşletme veya İçerik Üretici hesabına çevrilmiş olması ve bir Facebook Sayfası'na bağlı olması gerekir.",
        tips: [
            "Popup engelleyicinizi geçici olarak kapatın",
            "Instagram hesabınız kişisel hesapsa, önce Ayarlar > Hesap > Profesyonel hesaba geç yolunu izleyin"
        ]
    },
    {
        title: "Facebook ile Giriş Yapın",
        description: "Açılan pencerede Facebook hesabınızla oturum açın. Instagram işletme hesabınıza bağlı olan Facebook sayfasını yönetme yetkisi olan hesabı kullanmanız gerekir.",
        image: "/guide/ig_step2_fblogin_1773262647406.png",
        tips: [
            "Instagram hesabınızın bağlı olduğu Facebook sayfasının yöneticisi olan hesapla giriş yapın"
        ]
    },
    {
        title: "Bildirim Onayını Verin",
        description: "Facebook giriş sonrası iki faktörlü doğrulama devreye girer. Telefonunuza gelen Facebook bildirimini kontrol edin ve girişi onaylayın. \"Bildirimlerini kontrol et\" ekranında onay bekleniyor mesajını göreceksiniz.",
        image: "/guide/insta3.png",
        tips: [
            "Telefonunuzda Facebook uygulamasının yüklü ve bildirimlerinin açık olduğundan emin olun",
            "Bildirim gelmezse \"Başka bir yol dene\" seçeneğine tıklayabilirsiniz",
            "\"Bundan sonra bu cihaza güven\" seçeneğini işaretleyerek sonraki girişlerde bu adımı atlayabilirsiniz"
        ]
    },
    {
        title: "Sayfalar Öğesini Seçin",
        description: "UPGUN AI - UppyPro'nun erişmesini istediğiniz Facebook Sayfalar öğesini seçin. \"Sadece mevcut Sayfalar öğesine onay ver\" seçeneğini işaretleyin ve Instagram hesabınızın bağlı olduğu Facebook sayfasını listeden seçin.",
        image: "/guide/insta4.png",
        warning: "Doğru sayfayı seçmezseniz Instagram DM entegrasyonu çalışmaz. Instagram işletme hesabınızın bağlı olduğu sayfayı mutlaka seçin.",
        tips: [
            "Birden fazla sayfanız varsa Instagram hesabınıza bağlı olan sayfayı seçin",
            "Seçimi yaptıktan sonra \"Devam\" butonuna tıklayın"
        ]
    },
    {
        title: "İşletmeler Öğesini Seçin",
        description: "UppyPro'nun erişmesini istediğiniz İşletmeler öğesini seçin. \"Sadece mevcut İşletmeler öğesine onay ver\" seçeneğini işaretleyerek ilgili işletmenizi listeden seçin.",
        image: "/guide/insta5.png",
        tips: [
            "Doğru işletme hesabını (Meta Business Suite hesabınız) seçtiğinizden emin olun",
            "Seçimi yaptıktan sonra \"Devam\" butonuna tıklayın"
        ]
    },
    {
        title: "Instagram Hesabını Seçin",
        description: "UppyPro'nun erişmesini istediğiniz Instagram hesapları öğesini seçin. \"Sadece mevcut Instagram hesapları öğesine onay ver\" seçeneğini işaretleyin ve bağlamak istediğiniz Instagram işletme hesabını listeden seçin.",
        image: "/guide/insta6.png",
        tips: [
            "Birden fazla Instagram hesabınız varsa doğru olanı seçtiğinizden emin olun",
            "Sadece İşletme veya İçerik Üretici hesapları listede görünür"
        ]
    },
    {
        title: "Erişim İzinlerini Gözden Geçirin ve Kaydedin",
        description: "Son olarak UppyPro'nun erişim izinlerini gözden geçirin. Bu ekranda verilen tüm izinlerin özeti gösterilir: İşletme yönetimi, Instagram profil ve gönderi erişimi, mesaj yönetimi, sayfa içerik okuma, sayfa ayarları yönetimi ve sayfa listesi gösterimi. Tüm izinleri kontrol edip \"Kaydet\" butonuna tıklayın.",
        image: "/guide/insta7.png",
        warning: "Bu adımda eksik bırakılan izinler, UppyPro'nun düzgün çalışmasını engelleyebilir. Tüm izinlerin verildiğinden emin olun."
    },
    {
        title: "\"Anladım\" Butonuna Tıklayın",
        description: "Bağlantı başarıyla kuruldu! \"UPGUN AI - UppyPro, [hesap adı]'e bağlandı\" mesajını gördüğünüzde bağlantı işlemi tamamlanmıştır. \"Anladım\" butonuna tıklayarak pencereyi kapatın.",
        image: "/guide/insta8.png",
        tips: [
            "Bağlantıyı yönetmek isterseniz İşletme Entegrasyonlarına gidebilirsiniz",
            "Pencere kapandıktan sonra UppyPro paneli otomatik olarak güncellenecektir"
        ]
    },
    {
        title: "Başarıyla Bağlandı! 🎉",
        description: "Tebrikler! Instagram Business hesabınız başarıyla UppyPro'ya bağlandı. Artık müşterilerinizden gelen Instagram DM mesajlarını panelinizden görebilir ve yanıtlayabilirsiniz. Kart üzerinde \"Sistem Aktif\" yazısı ile bağlı hesap bilgileriniz görünecektir.",
        image: "/guide/insta9.png"
    }
];

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer animate-in fade-in duration-200"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
                <X className="w-6 h-6" />
            </button>
            <img
                src={src}
                alt={alt}
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
}

function StepCard({ step, index, total, onImageClick }: { step: GuideStep; index: number; total: number; onImageClick: (src: string, alt: string) => void }) {
    return (
        <div className="flex flex-col md:flex-row gap-5 p-5 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            {/* Step Image */}
            <div className="md:w-[300px] shrink-0">
                <div
                    className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shadow-inner cursor-zoom-in group relative"
                    onClick={() => onImageClick(step.image, step.title)}
                >
                    <img
                        src={step.image}
                        alt={step.title}
                        className="w-full h-auto transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-80 transition-opacity drop-shadow-lg" />
                    </div>
                </div>
            </div>

            {/* Step Content */}
            <div className="flex-1 space-y-3">
                <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                        {index === total - 1 ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                    </span>
                    <div>
                        <h4 className="text-base font-bold text-slate-900">{step.title}</h4>
                        <p className="text-sm text-slate-600 leading-relaxed mt-1">{step.description}</p>
                    </div>
                </div>

                {/* Warning */}
                {step.warning && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 ml-11">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 leading-relaxed">{step.warning}</p>
                    </div>
                )}

                {/* Tips */}
                {step.tips && step.tips.length > 0 && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 ml-11 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 mb-1">
                            <Info className="w-3.5 h-3.5" />
                            İpuçları
                        </div>
                        {step.tips.map((tip, i) => (
                            <p key={i} className="text-xs text-blue-700 flex items-start gap-1.5">
                                <span className="text-blue-400 mt-0.5">•</span>
                                {tip}
                            </p>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function GuideSection({
    title,
    icon,
    steps,
    gradientFrom,
    gradientTo,
    borderColor,
    iconBg
}: {
    title: string;
    icon: React.ReactNode;
    steps: GuideStep[];
    gradientFrom: string;
    gradientTo: string;
    borderColor: string;
    iconBg: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

    return (
        <>
        <div className={clsx("rounded-2xl border transition-all duration-300", borderColor, isOpen && "shadow-lg")}>
            {/* Header */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-300 group",
                    isOpen ? `bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white` : "bg-white hover:bg-slate-50 text-slate-800"
                )}
            >
                <div className="flex items-center gap-3">
                    <div className={clsx(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                        isOpen ? "bg-white/20 [&_svg]:text-white" : iconBg
                    )}>
                        {icon}
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-base">{title}</h3>
                        <p className={clsx("text-xs", isOpen ? "text-white/70" : "text-slate-500")}>
                            {steps.length} adımlık bağlantı kılavuzu
                        </p>
                    </div>
                </div>
                <ChevronDown className={clsx(
                    "w-5 h-5 transition-transform duration-300",
                    isOpen && "rotate-180"
                )} />
            </button>

            {/* Content */}
            <div className={clsx(
                "transition-all duration-500 overflow-hidden",
                isOpen ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
            )}>
                <div className="p-5 space-y-4 bg-slate-50/50">
                    {steps.map((step, index) => (
                        <StepCard key={index} step={step} index={index} total={steps.length} onImageClick={(src, alt) => setLightbox({ src, alt })} />
                    ))}
                </div>
            </div>
        </div>
        {lightbox && <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
        </>
    );
}

export function ConnectionGuide() {
    return (
        <div className="space-y-4">
            <GuideSection
                title="WhatsApp Bağlantı Adımları"
                icon={<MessageCircle className="w-5 h-5 text-green-600" />}
                steps={whatsappSteps}
                gradientFrom="from-green-500"
                gradientTo="to-emerald-600"
                borderColor="border-green-200"
                iconBg="bg-green-100"
            />

            <GuideSection
                title="Instagram Bağlantı Adımları"
                icon={<Instagram className="w-5 h-5 text-red-600" />}
                steps={instagramSteps}
                gradientFrom="from-red-600"
                gradientTo="to-red-700"
                borderColor="border-red-200"
                iconBg="bg-red-100"
            />
        </div>
    );
}
