import { LandingHeader, LandingFooter } from "@/components/landing/layout";
import { HeroSection } from "@/components/landing/hero";
import { FeaturesSection, PricingSection, HowItWorks, ContactSection } from "@/components/landing/sections";
import { MobileAccessSection } from "@/components/landing/mobile-access";
import { SolutionsSection } from "@/components/landing/solutions";
import { FaqSection } from "@/components/landing/faq";
import { PackageFinderSection } from "@/components/landing/package-finder";
import { BlogPreviewSection } from "@/components/landing/blog-preview";
import { getProductPrices } from "@/app/actions/pricing";
export const dynamic = 'force-dynamic';

export default async function LandingPage() {
    const prices = await getProductPrices();

    const inboxPrice = prices?.uppypro_inbox || prices?.base_inbox || prices?.inbox || 895;
    const aiPrice = prices?.ai || prices?.uppypro_ai || 4794;

    // JSON-LD Structured Data
    const organizationSchema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "UPGUN AI",
        url: "https://www.upgunai.com",
        logo: "https://www.upgunai.com/uppypro_logo_avatar.png",
        description: "WhatsApp ve Instagram mesajlarınızı yapay zeka destekli tek panelden yönetin.",
        address: {
            "@type": "PostalAddress",
            streetAddress: "Nisbetiye Mh. Gazi Güçnar Sk. No: 4",
            addressLocality: "Beşiktaş",
            addressRegion: "İstanbul",
            addressCountry: "TR",
        },
        contactPoint: {
            "@type": "ContactPoint",
            telephone: "+90-212-283-71-75",
            contactType: "customer service",
            availableLanguage: ["Turkish"],
        },
        sameAs: ["https://www.instagram.com/upgunai"],
    };

    const softwareSchema = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "UppyPro",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: "WhatsApp ve Instagram mesajlarını yapay zeka ile tek panelden yönetme platformu. AI asistan, takvim, CRM, çeviri, metin düzeltme özellikleri.",
        offers: [
            {
                "@type": "Offer",
                name: "UppyPro Inbox",
                price: String(inboxPrice),
                priceCurrency: "TRY",
                description: "WhatsApp ve Instagram tek inbox, hazır cevaplar, müşteri kartı",
            },
            {
                "@type": "Offer",
                name: "UppyPro AI",
                price: String(aiPrice),
                priceCurrency: "TRY",
                description: "7/24 AI asistan, takvim, çeviri, metin düzeltme, devral/devret",
            },
        ],
        aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.8",
            reviewCount: "50",
        },
    };

    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
            {
                "@type": "Question",
                name: "AI kurulumu ve entegrasyonu zor mu?",
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "Hayır! İşletmenizle ilgili temel bilgileri panele girmeniz yeterlidir. AI modelimiz teknik ekibimiz tarafından bu bilgilerle eğitilir ve 2 iş günü içinde yanıt vermeye başlar.",
                },
            },
            {
                "@type": "Question",
                name: "İstediğim zaman araya girebilir miyim?",
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "Kesinlikle. 'Konuşmayı Devral' butonuna bastığınız anda AI susar ve kontrol size geçer. Sohbeti tekrar AI'ya devretmek isterseniz tek tıkla geri mod değiştirebilirsiniz.",
                },
            },
            {
                "@type": "Question",
                name: "Kredi kartı bilgisi girmem gerekiyor mu?",
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "Hayır, 14 günlük deneme sürümü için kart bilgisi gerekmez. Ücretsiz deneme için talep oluşturmanız halinde ekibimiz en kısa sürede size ulaşıp deneme sürümünüzü aktif hale getirecektir.",
                },
            },
            {
                "@type": "Question",
                name: "Teknik bilgim olmadan sistemi kullanabilir miyim?",
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "Evet. Kurduğumuz sistemlerin ara yüzleri mümkün olduğunca sade ve Türkçe olacak şekilde tasarlanır. Teslimat sonrası kısa bir eğitim veriyoruz ve basit dokümanlar sağlıyoruz.",
                },
            },
            {
                "@type": "Question",
                name: "WhatsApp ve Instagram dışında web siteme de entegre edebilir miyim?",
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "Evet, kurumsal çözümler paketimiz dahilinde yapay zeka asistanınızı web sayfanıza entegre etmek için özel web widgetlar üretiyoruz.",
                },
            },
            {
                "@type": "Question",
                name: "Paket satın alımlarında teknik destek veriyor musunuz?",
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "Elbette. Yaşadığınız herhangi bir teknik problem için talep oluşturmanız halinde 24-48 saat içinde ekibimiz dönüş yaparak yardımcı olacaktır.",
                },
            },
        ],
    };

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-orange-100 selection:text-orange-900">
            {/* JSON-LD Structured Data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />
            <LandingHeader />
            <main>
                <HeroSection />
                <HowItWorks />
                <FeaturesSection />
                <MobileAccessSection />
                <PricingSection inboxPrice={inboxPrice} aiPrice={aiPrice} />

                <PackageFinderSection />

                <FaqSection />

                <BlogPreviewSection />

                <SolutionsSection />

                <ContactSection />
            </main>
            <LandingFooter />
        </div>
    );
}
