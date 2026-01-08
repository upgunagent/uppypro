import { LandingHeader, LandingFooter } from "@/components/landing/layout";
import { HeroSection } from "@/components/landing/hero";
import { FeaturesSection, PricingSection, HowItWorks } from "@/components/landing/sections";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-orange-100 selection:text-orange-900">
            <LandingHeader />
            <main>
                <HeroSection />
                <HowItWorks />
                <FeaturesSection />
                <PricingSection />

                {/* FAQ Section Placeholder */}
                <section className="py-24 bg-slate-50" id="faq">
                    <div className="container mx-auto px-4 max-w-3xl text-center">
                        <h2 className="text-3xl font-bold text-slate-900 mb-8">Sıkça Sorulan Sorular</h2>
                        <div className="space-y-4 text-left">
                            <details className="group bg-white rounded-xl shadow-sm border border-slate-200">
                                <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-6 text-slate-800">
                                    <span>AI kurulumu zor mu?</span>
                                    <span className="transition group-open:rotate-180">
                                        <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                                    </span>
                                </summary>
                                <div className="text-slate-500 mt-0 px-6 pb-6 text-sm leading-relaxed">
                                    Hayır! İşletmenizle ilgili temel bilgileri (fiyat listesi, adres, hizmetler) panele girmeniz yeterlidir. AI modelimiz bu bilgilerle otomatik olarak eğitilir ve hemen yanıt vermeye başlar.
                                </div>
                            </details>
                            <details className="group bg-white rounded-xl shadow-sm border border-slate-200">
                                <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-6 text-slate-800">
                                    <span>İstediğim zaman araya girebilir miyim?</span>
                                    <span className="transition group-open:rotate-180">
                                        <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                                    </span>
                                </summary>
                                <div className="text-slate-500 mt-0 px-6 pb-6 text-sm leading-relaxed">
                                    Kesinlikle. "Devral (Human)" butonuna bastığınız anda AI susar ve kontrol size geçer. Sohbeti tekrar AI'ya devretmek isterseniz tek tıkla geri mod değiştirebilirsiniz.
                                </div>
                            </details>
                            <details className="group bg-white rounded-xl shadow-sm border border-slate-200">
                                <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-6 text-slate-800">
                                    <span>Kredi kartı bilgisi girmem gerekiyor mu?</span>
                                    <span className="transition group-open:rotate-180">
                                        <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                                    </span>
                                </summary>
                                <div className="text-slate-500 mt-0 px-6 pb-6 text-sm leading-relaxed">
                                    Hayır, 14 günlük deneme sürümü için kart bilgisi gerekmez. Sadece hesap oluşturun ve kullanmaya başlayın.
                                </div>
                            </details>
                        </div>
                    </div>
                </section>
            </main>
            <LandingFooter />
        </div>
    );
}
