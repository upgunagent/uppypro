import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { LandingHeader, LandingFooter } from "@/components/landing/layout";
import { Calendar, Clock, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
    title: "Blog | UppyPro — UPGUN AI",
    description: "WhatsApp ve Instagram işletme iletişimi, yapay zeka müşteri hizmetleri, otomasyon ve dijital dönüşüm hakkında güncel blog yazıları.",
    alternates: { canonical: "https://www.upgunai.com/blog" },
};

const BLOG_POSTS = [
    {
        slug: "whatsapp-business-api-vs-normal-whatsapp",
        title: "WhatsApp Business API vs Normal WhatsApp Business: İşletmeniz İçin Hangisi Doğru?",
        excerpt: "İki WhatsApp çözümü arasındaki kritik farkları, API'nin sunduğu avantajları ve işletmeniz büyüdüğünde neden geçiş yapmanız gerektiğini detaylı karşılaştırmalı analiz ile keşfedin.",
        date: "15 Mart 2026",
        readTime: "8 dk",
        category: "WhatsApp",
        image: "/blog/blog1.png",
    },
    {
        slug: "yapay-zeka-musteri-hizmetleri-2026",
        title: "2026'da Yapay Zeka Müşteri Hizmetleri: İşletmelerin %80'i Neden AI Asistan Kullanıyor?",
        excerpt: "Yapay zeka destekli müşteri hizmetlerinin yükselişi, geleneksel yöntemlerin neden yetersiz kaldığı ve AI asistanların işletmelere sağladığı somut faydalar hakkında kapsamlı rehber.",
        date: "12 Mart 2026",
        readTime: "10 dk",
        category: "Yapay Zeka",
        image: "/blog/blog2.png",
    },
    {
        slug: "instagram-dm-satis-donusturme",
        title: "Instagram DM'den Satışa: Sosyal Medya Mesajlarını Gelire Dönüştürmenin 7 Yolu",
        excerpt: "Instagram DM'lerinizi sadece sohbet aracı olmaktan çıkarıp güçlü bir satış kanalına dönüştürmenin pratik yolları. Gerçek örnekler ve uygulanabilir stratejiler.",
        date: "8 Mart 2026",
        readTime: "7 dk",
        category: "Instagram",
        image: "/blog/blog3.png",
    },
    {
        slug: "kucuk-isletmeler-iletisim-otomasyonu",
        title: "Küçük İşletmeler İçin Müşteri İletişim Otomasyonu: Nereden Başlamalı?",
        excerpt: "Bütçesi sınırlı ama büyüme hedefi olan küçük işletmelerin dijital iletişim otomasyonuna adım adım geçiş rehberi. Maliyetler, araçlar ve başarı hikayeleri.",
        date: "5 Mart 2026",
        readTime: "9 dk",
        category: "Otomasyon",
        image: "/blog/blog4.png",
    },
    {
        slug: "randevu-noshow-orani-dusurme",
        title: "Randevu No-Show Oranını %60 Düşürmenin Sırrı: WhatsApp Hatırlatma Otomasyonu",
        excerpt: "Randevu kaçırma sorunu tüm hizmet sektörünün ortak derdi. WhatsApp hatırlatma otomasyonunun no-show oranını nasıl dramatik şekilde düşürdüğünü verilerle gösteriyoruz.",
        date: "1 Mart 2026",
        readTime: "6 dk",
        category: "Randevu Yönetimi",
        image: "/blog/blog5.png",
    },
    {
        slug: "musteri-sadakati-whatsapp-crm",
        title: "Müşteri Sadakati ve Tekrar Satış: WhatsApp ile Müşterilerinizi Elde Tutmanın 5 Altın Kuralı",
        excerpt: "Yeni müşteri kazanmak, mevcut müşteriyi elde tutmaktan 5 kat daha pahalı. WhatsApp CRM ile müşteri sadakatini artırmanın ve tekrar satışı garantilemenin kanıtlanmış yolları.",
        date: "25 Şubat 2026",
        readTime: "8 dk",
        category: "Müşteri Sadakati",
        image: "/blog/blog6.png",
    },
];

export default function BlogPage() {
    return (
        <div className="min-h-screen bg-white font-sans text-slate-900">
            <LandingHeader />
            <main>
                {/* Hero */}
                <section className="bg-slate-900 text-white py-16 md:py-24">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h1 className="text-3xl md:text-5xl font-bold mb-4"><span className="text-orange-500">Uppy</span>Pro Blog</h1>
                        <p className="text-lg text-slate-300 max-w-2xl mx-auto">WhatsApp & Instagram iletişim yönetimi, yapay zeka ve dijital dönüşüm hakkında güncel içerikler.</p>
                    </div>
                </section>

                {/* Blog Grid */}
                <section className="py-16 md:py-24">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-3 gap-3 md:gap-8">
                            {BLOG_POSTS.map((post, i) => (
                                <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
                                    <article className="bg-white rounded-xl md:rounded-2xl border border-slate-200 overflow-hidden hover:border-orange-300 hover:shadow-xl transition-all duration-300">
                                        {/* Blog Image */}
                                        <div className="aspect-square relative overflow-hidden">
                                            <Image
                                                src={post.image}
                                                alt={post.title}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                sizes="33vw"
                                            />
                                        </div>

                                        {/* Content */}
                                        <div className="p-2 md:p-6">
                                            <div className="hidden md:flex items-center gap-4 text-xs text-slate-400 mb-3">
                                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {post.date}</span>
                                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {post.readTime}</span>
                                            </div>
                                            <span className="hidden md:inline-block px-3 py-1 bg-orange-50 text-orange-600 text-xs font-bold rounded-full mb-3">{post.category}</span>
                                            <h2 className="text-[10px] md:text-lg font-bold text-slate-900 mb-1 md:mb-2 group-hover:text-orange-600 transition-colors leading-tight line-clamp-2">{post.title}</h2>
                                            <p className="hidden md:block text-sm text-slate-500 leading-relaxed mb-4">{post.excerpt}</p>
                                            <span className="hidden md:inline-flex items-center gap-1 text-sm font-semibold text-orange-600 group-hover:gap-2 transition-all">
                                                Devamını Oku <ArrowRight className="w-4 h-4" />
                                            </span>
                                        </div>
                                    </article>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
            <LandingFooter />
        </div>
    );
}
