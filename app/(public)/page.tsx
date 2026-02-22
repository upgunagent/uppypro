import { LandingHeader, LandingFooter } from "@/components/landing/layout";
import { HeroSection } from "@/components/landing/hero";
import { FeaturesSection, PricingSection, HowItWorks, ContactSection } from "@/components/landing/sections";
import { SolutionsSection } from "@/components/landing/solutions";
import { getProductPrices } from "@/app/actions/pricing";

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
    const prices = await getProductPrices();

    const inboxPrice = prices?.uppypro_inbox || prices?.base_inbox || prices?.inbox || 895;
    const aiPrice = prices?.ai || prices?.uppypro_ai || 4794;

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-orange-100 selection:text-orange-900">
            <LandingHeader />
            <main>
                <HeroSection />
                <HowItWorks />
                <FeaturesSection />
                <PricingSection inboxPrice={inboxPrice} aiPrice={aiPrice} />

                {/* FAQ Section */}
                <section className="py-24 bg-slate-50" id="faq">
                    <div className="container mx-auto px-4 max-w-3xl text-center">
                        <h2 className="text-3xl font-bold text-slate-900 mb-8">Sıkça Sorulan Sorular</h2>
                        <div className="space-y-3 text-left">
                            {/* Original FAQs */}
                            <details className="group bg-white rounded-xl shadow-sm border border-slate-200">
                                <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-4 text-slate-800">
                                    <span>AI kurulumu ve entegrasyonu zor mu?</span>
                                    <span className="transition group-open:rotate-180">
                                        <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                                    </span>
                                </summary>
                                <div className="text-slate-500 mt-0 px-4 pb-4 text-sm leading-relaxed">
                                    Hayır! İşletmenizle ilgili temel bilgileri (fiyat listesi, adres, hizmetler) panele girmeniz yeterlidir. AI modelimiz teknik ekibimiz tarafından bu bilgilerle göre eğitilir ve 2 iş günü içinde yanıt vermeye başlar.
                                </div>
                            </details>
                            <details className="group bg-white rounded-xl shadow-sm border border-slate-200">
                                <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-4 text-slate-800">
                                    <span>İstediğim zaman araya girebilir miyim?</span>
                                    <span className="transition group-open:rotate-180">
                                        <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                                    </span>
                                </summary>
                                <div className="text-slate-500 mt-0 px-4 pb-4 text-sm leading-relaxed">
                                    Kesinlikle. "Konuşmayı Devral" butonuna bastığınız anda AI susar ve kontrol size geçer. Sohbeti tekrar AI'ya devretmek isterseniz tek tıkla geri mod değiştirebilirsiniz.
                                </div>
                            </details>
                            <details className="group bg-white rounded-xl shadow-sm border border-slate-200">
                                <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-4 text-slate-800">
                                    <span>Kredi kartı bilgisi girmem gerekiyor mu?</span>
                                    <span className="transition group-open:rotate-180">
                                        <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                                    </span>
                                </summary>
                                <div className="text-slate-500 mt-0 px-4 pb-4 text-sm leading-relaxed">
                                    Hayır, 14 günlük deneme sürümü için kart bilgisi gerekmez. Sadece hesap oluşturun ve kullanmaya başlayın.
                                </div>
                            </details>

                            {/* New FAQs */}
                            <details className="group bg-white rounded-xl shadow-sm border border-slate-200">
                                <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-4 text-slate-800">
                                    <span>Otomasyon için çok büyük bir bütçe ayırmam gerekiyor mu?</span>
                                    <span className="transition group-open:rotate-180">
                                        <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                                    </span>
                                </summary>
                                <div className="text-slate-500 mt-0 px-4 pb-4 text-sm leading-relaxed">
                                    Hayır. Çoğu müşterimiz, tek bir chatbot veya tek bir iş akışı ile başlıyor. En büyük yükü alan süreci seçip, en küçük bütçeyle ilk kazanımı yaratmaya odaklanıyoruz.
                                </div>
                            </details>
                            <details className="group bg-white rounded-xl shadow-sm border border-slate-200">
                                <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-4 text-slate-800">
                                    <span>Teknik bilgim olmadan sistemi kullanabilir miyim?</span>
                                    <span className="transition group-open:rotate-180">
                                        <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                                    </span>
                                </summary>
                                <div className="text-slate-500 mt-0 px-4 pb-4 text-sm leading-relaxed">
                                    Evet. Kurduğumuz sistemlerin ara yüzleri mümkün olduğunca sade ve Türkçe olacak şekilde tasarlanır. Zaten teslimat sonrası kısa bir eğitim veriyoruz ve basit dokümanlar sağlıyoruz.
                                </div>
                            </details>
                            <details className="group bg-white rounded-xl shadow-sm border border-slate-200">
                                <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-4 text-slate-800">
                                    <span>WhatsApp ve Instagram dışında kendi web siteme de entegre edebilir miyim?</span>
                                    <span className="transition group-open:rotate-180">
                                        <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                                    </span>
                                </summary>
                                <div className="text-slate-500 mt-0 px-4 pb-4 text-sm leading-relaxed">
                                    Evet, kurumsal çözümler paketimiz dahilinde sizin için oluşturduğumuz otomasyon içerikli yapay zeka asistanınızı web sayfanıza entegre etmek için özel web widgetlar üretiyoruz.
                                </div>
                            </details>
                            <details className="group bg-white rounded-xl shadow-sm border border-slate-200">
                                <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-4 text-slate-800">
                                    <span>Kurumsal Otomasyon paketini tercih edersem ne kadar sürede canlı kullanıma geçeriz?</span>
                                    <span className="transition group-open:rotate-180">
                                        <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                                    </span>
                                </summary>
                                <div className="text-slate-500 mt-0 px-4 pb-4 text-sm leading-relaxed">
                                    Basit bir chatbot veya iş akışı kurgusu genellikle 7-10 iş günü içinde canlıya alınabilir. Daha karmaşık entegrasyonlar için süreyi proje kapsamına göre planlıyoruz.
                                </div>
                            </details>
                            <details className="group bg-white rounded-xl shadow-sm border border-slate-200">
                                <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-4 text-slate-800">
                                    <span>Paket satın alımlarında teknik destek veriyor musunuz?</span>
                                    <span className="transition group-open:rotate-180">
                                        <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                                    </span>
                                </summary>
                                <div className="text-slate-500 mt-0 px-4 pb-4 text-sm leading-relaxed">
                                    Elbette. Yaşadığınız herhangi bir teknik problem için talep oluşturmanız halinde 24-48 saat içinde ekibimiz dönüş yaparak yardımcı olacaktır.
                                </div>
                            </details>
                        </div>
                    </div>
                </section>

                <SolutionsSection />

                <ContactSection />
            </main>
            <LandingFooter />
        </div>
    );
}
