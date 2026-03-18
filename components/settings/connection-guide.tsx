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
    link?: { label: string; url: string };
}

const whatsappSteps: GuideStep[] = [
    {
        title: "\"WhatsApp'ı Bağla\" Butonuna Tıklayın",
        description: "İşletme Ayarları > Bağlantılar > İletişim Kanalları sekmesindeki yeşil WhatsApp kartında bulunan \"WhatsApp'ı Bağla\" butonuna tıklayın. Bu işlem Meta'nın Embedded Signup sihirbazını yeni bir pencerede başlatacaktır.",
        image: "/guide/whatsapp1.png",
        tips: [
            "Tarayıcınızda popup engelleyici varsa geçici olarak kapatın",
            "Google Chrome veya Firefox tarayıcıları önerilir"
        ]
    },
    {
        title: "Facebook ile Giriş Yapın",
        description: "Açılan pencerede Facebook hesabınızla giriş yapın. E-posta veya telefon numaranızı ve şifrenizi girerek \"Giriş Yap\" butonuna tıklayın. İşletmenizin Facebook sayfasını yönetme yetkisi olan hesabı kullanmanız gerekmektedir.",
        image: "/guide/whatsapp2.png",
        tips: [
            "İşletmenizin Facebook sayfasının yöneticisi olan hesapla giriş yapın",
            "İki faktörlü doğrulama açıksa telefonunuzu hazır bulundurun"
        ]
    },
    {
        title: "Hesabınızı Bağlayın ve Koşulları Onaylayın",
        description: "Giriş yaptıktan sonra \"Hesabını upgunai ile sorunsuz bir şekilde bağla\" ekranı açılacaktır. Bu ekranda Cloud API ile müşterilerinize geniş ölçekte iletişim kurabileceğiniz, büyük hacimli mesajları kolaylıkla yönetebileceğiniz bilgileri göreceksiniz. Koşulları inceleyip \"Devam\" butonuna tıklayın.",
        image: "/guide/whatsapp3.png",
        tips: [
            "Bulut API'si İçin Meta Barındırma Koşullarını ve WhatsApp Business İçin Meta Koşullarını incelemenizi öneririz"
        ]
    },
    {
        title: "İşletme Portföyünüzü ve WhatsApp Business Hesabınızı Seçin",
        description: "\"UPGUN AI - UppyPro ile paylaşılacak işletme varlıklarını seçin\" ekranında İşletme Portföyünüzü seçin veya mevcut portföyünüzü onaylayın. Ayrıca WhatsApp Business hesabınızı seçin ya da \"WhatsApp Business hesabı oluşturun\" seçeneğiyle yeni bir WABA oluşturun. Ardından \"İleri\" butonuna tıklayın.",
        image: "/guide/whatsapp4.png",
        tips: [
            "Zaten bir Meta Business hesabınız varsa mevcut portföyü seçin",
            "Yeni portföy oluşturuyorsanız işletme adınızı doğru girdiğinizden emin olun"
        ]
    },
    {
        title: "İşletme Bilgilerinizi Girin",
        description: "\"Yeni varlıklar için işletme bilgilerini girin\" ekranında işletmenizin adını, kategorisini (örn. Giyim ve Kıyafet), ülkenizi (Türkiye), internet sitenizin adresini ve saat diliminizi ((GMT+03:00) Europe/Istanbul) girin. Tüm bilgileri doğru girdiğinizden emin olun ve \"İleri\" butonuna tıklayın.",
        image: "/guide/whatsapp5.png",
        tips: [
            "İşletme adı ve kategorisini doğru seçmek, WhatsApp Business profilinizin onaylanmasını hızlandırır",
            "İnternet sitesi alanına işletmenizin web sitesini ekleyin"
        ]
    },
    {
        title: "Telefon Numarası ve Görünen Adı Belirleyin",
        description: "\"WhatsApp telefon numaranı ekle\" ekranında \"Yeni bir numara ekle\" seçeneğini işaretleyerek telefon numaranızı girin. Ülke kodunun TR +90 olarak seçili olduğundan emin olun. WhatsApp Business görünen adı kısmına işletmenizin adını yazın. Doğrulama yöntemi olarak \"Kısa mesaj\" veya \"Telefon araması\" seçeneklerinden birini seçip \"İleri\"ye tıklayın.",
        image: "/guide/whatsapp6.png",
        warning: "Bu numara halihazırda kişisel WhatsApp uygulamasında kullanılıyorsa kişisel hesabınız devre dışı kalabilir. İşletme için ayrı bir hat kullanmanızı öneririz. WhatsApp İşletme hesabı için sabit hatlarınızı da kullanabilirsiniz, ayrıca bir GSM hattı almanıza gerek yoktur.",
        tips: [
            "Sabit telefon kullanıyorsanız \"Telefon araması\" yöntemini seçin",
            "Görünen ad, işletme adınızla eşleşmeli ve WhatsApp Business kurallarına uygun olmalıdır"
        ]
    },
    {
        title: "Doğrulama Kodunu Girin",
        description: "\"Telefon numaranızı doğrulayın\" ekranında, telefonunuza gelen 6 haneli doğrulama kodunu ilgili alanlara girin. Kod telefon araması veya SMS ile gelecektir. Kodu doğru girdikten sonra \"İleri\" butonuna tıklayın. İleri butonuna tıkladıktan sonra Meta, hesabınızı doğrulamak için 24-48 saat arasında bir süre alabilir. Hesabınız onaylandıktan sonra mesaj alışverişi yapabilirsiniz.",
        image: "/guide/whatsapp7.png",
        warning: "WhatsApp şablonlarını kullanabilmek için Meta Business Manager'daki WhatsApp yönetim sayfasında kredi kartı tanımlamanız gerekmektedir. Aşağıdaki bağlantıdan Meta WhatsApp Manager sayfasına ulaşabilirsiniz.",
        link: {
            label: "Meta WhatsApp Manager'a Git",
            url: "https://business.facebook.com/wa/manage/"
        },
        tips: [
            "Kod gelmezse belirtilen süre sonunda yeni bir kod talep edebilirsiniz",
            "Doğrulama yönteminizi değiştirerek tekrar deneyebilirsiniz",
            "Hesap doğrulama süresi genellikle 24-48 saat arasında tamamlanır"
        ]
    },
    {
        title: "Bağlantı Tamamlandı! 🎉",
        description: "Tebrikler! WhatsApp Business hesabınız başarıyla UppyPro'ya bağlandı. Kart üzerinde \"Sistem Aktif\" yazısını ve bağlı hesap bilgilerinizi göreceksiniz. Artık müşterilerinizden gelen WhatsApp mesajlarını UppyPro panelinizden görebilir, AI Asistan ile otomatik yanıt verebilir ve konuşmalarınızı tek bir yerden yönetebilirsiniz.",
        image: "/guide/whatsapp8.png"
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

                {/* External Link */}
                {step.link && (
                    <a
                        href={step.link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 ml-11 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm hover:shadow-md"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        {step.link.label}
                    </a>
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
