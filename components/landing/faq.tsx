"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";

const faqs = [
    {
        q: "AI kurulumu ve entegrasyonu zor mu?",
        a: "Kesinlikle hayır! Aksine \"Sistem Mesajı Sihirbazı\" ile birkaç adımda işletmenizle ilgili temel bilgileri (çalışma saatleri, fiyat listesi, adres, hizmetler) girerek yapay zeka yardımıyla AI asistanınızın eğitimini tamamlayabilir ve 2 dakika içinde aktif hale getirebilirsiniz."
    },
    {
        q: "İstediğim zaman araya girebilir miyim?",
        a: "Kesinlikle. \"Konuşmayı Devral\" butonuna bastığınız anda AI susar ve kontrol size geçer. Sohbeti tekrar AI'ya devretmek isterseniz tek tıkla geri mod değiştirebilirsiniz."
    },
    {
        q: "Kredi kartı bilgisi girmem gerekiyor mu?",
        a: "Evet, 7 günlük ücretsiz deneme süresinden yararlanmak için kredi kartı bilginizi girmeniz gerekir. Ancak deneme süresi boyunca kartınızdan herhangi bir ücret çekilmez. 7 gün içinde aboneliğinizi iptal ederseniz hiçbir ücret ödemeniz gerekmez. İptal etmezseniz, deneme süresi sonunda otomatik olarak abonelik ücreti tahsil edilir."
    },
    {
        q: "Otomasyon için çok büyük bir bütçe ayırmam gerekiyor mu?",
        a: "Hayır. Çoğu müşterimiz, tek bir chatbot veya tek bir iş akışı ile başlıyor. En büyük yükü alan süreci seçip, en küçük bütçeyle ilk kazanımı yaratmaya odaklanıyoruz."
    },
    {
        q: "Teknik bilgim olmadan sistemi kullanabilir miyim?",
        a: "Evet. Kurduğumuz sistemlerin ara yüzleri mümkün olduğunca sade ve Türkçe olacak şekilde tasarlanır. Zaten teslimat sonrası kısa bir eğitim veriyoruz ve basit dokümanlar sağlıyoruz."
    },
    {
        q: "WhatsApp ve Instagram dışında kendi web siteme de entegre edebilir miyim?",
        a: "Evet, kurumsal çözümler paketimiz dahilinde sizin için oluşturduğumuz otomasyon içerikli yapay zeka asistanınızı web sayfanıza entegre etmek için özel web widgetlar üretiyoruz. (Paket fiyatınızın dışında ücretlendirilir.)"
    },
    {
        q: "Kurumsal Otomasyon paketini tercih edersem ne kadar sürede canlı kullanıma geçeriz?",
        a: "Basit bir chatbot veya iş akışı kurgusu genellikle 2-7 iş günü içinde canlıya alınabilir. Daha karmaşık entegrasyonlar için süreyi proje kapsamına göre planlıyoruz."
    },
    {
        q: "Paket satın alımlarında teknik destek veriyor musunuz?",
        a: "Elbette. Yaşadığınız herhangi bir teknik problem için talep oluşturmanız halinde 24-48 saat içinde ekibimiz dönüş yaparak yardımcı olacaktır."
    }
];

export function FaqSection() {
    const [isOpenMobile, setIsOpenMobile] = useState(false);

    return (
        <section className="py-12 md:py-24 bg-slate-50" id="faq">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto text-center">
                    
                    {/* Desktop Heading */}
                    <h2 className="hidden md:block text-3xl font-bold text-slate-900 mb-8">
                        Sıkça Sorulan Sorular
                    </h2>

                    {/* Mobile Button Heading */}
                    <button 
                        onClick={() => setIsOpenMobile(!isOpenMobile)}
                        className="md:hidden w-full bg-white flex items-center justify-between p-4 rounded-2xl shadow-sm border border-slate-200 mb-4"
                    >
                        <span className="text-lg font-bold text-slate-900">Sıkça Sorulan Sorular</span>
                        <ChevronDown className={clsx("w-5 h-5 text-slate-500 transition-transform duration-300", isOpenMobile && "rotate-180")} />
                    </button>

                    {/* FAQ List */}
                    <div className={clsx("space-y-3 text-left", !isOpenMobile && "hidden md:block")}>
                        {faqs.map((faq, i) => (
                            <details key={i} className="group bg-white rounded-xl shadow-sm border border-slate-200 open:border-orange-500 open:shadow-md open:shadow-orange-100 transition-all duration-200">
                                <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-4 text-slate-800">
                                    <span className="text-sm md:text-base pr-4">{faq.q}</span>
                                    <span className="transition group-open:rotate-180 flex-shrink-0">
                                        <ChevronDown className="w-5 h-5 text-slate-400" />
                                    </span>
                                </summary>
                                <div className="text-slate-500 mt-0 px-4 pb-4 text-xs md:text-sm leading-relaxed">
                                    {faq.a}
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
