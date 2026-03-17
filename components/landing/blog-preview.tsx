import Link from "next/link";
import Image from "next/image";

const BLOG_ITEMS = [
    { slug: "whatsapp-business-api-vs-normal-whatsapp", title: "WhatsApp Business API vs Normal WhatsApp Business", image: "/blog/blog1.png" },
    { slug: "yapay-zeka-musteri-hizmetleri-2026", title: "2026'da AI Müşteri Hizmetleri: Neden Herkes Kullanıyor?", image: "/blog/blog2.png" },
    { slug: "instagram-dm-satis-donusturme", title: "Instagram DM'den Satışa: 7 Etkili Yol", image: "/blog/blog3.png" },
    { slug: "kucuk-isletmeler-iletisim-otomasyonu", title: "Küçük İşletmeler İçin İletişim Otomasyonu", image: "/blog/blog4.png" },
    { slug: "randevu-noshow-orani-dusurme", title: "No-Show Oranını %60 Düşürmenin Sırrı", image: "/blog/blog5.png" },
    { slug: "musteri-sadakati-whatsapp-crm", title: "WhatsApp CRM ile Müşteri Sadakati", image: "/blog/blog6.png" },
];

export function BlogPreviewSection() {
    return (
        <section className="py-16 md:py-20 bg-slate-900">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-10">
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                        <span className="text-orange-500">Uppy</span>Pro Blog
                    </h2>
                    <p className="text-slate-400 text-sm max-w-lg mx-auto">İşletme iletişimi, yapay zeka ve otomasyon hakkında faydalı içerikler</p>
                </div>

                {/* Blog Grid — 3 per row */}
                <div className="grid grid-cols-3 gap-3 md:gap-6">
                    {BLOG_ITEMS.slice(0, 3).map((item) => (
                        <Link key={item.slug} href={`/blog/${item.slug}`} className="group">
                            <div className="rounded-xl overflow-hidden border border-white/10 hover:border-orange-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10">
                                {/* Image */}
                                <div className="aspect-square relative overflow-hidden">
                                    <Image
                                        src={item.image}
                                        alt={item.title}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                        sizes="33vw"
                                    />
                                </div>
                                {/* Title */}
                                <div className="p-3 md:p-4 bg-slate-800/80">
                                    <h3 className="text-xs md:text-sm font-semibold text-slate-200 group-hover:text-orange-400 transition-colors leading-snug line-clamp-2">
                                        {item.title}
                                    </h3>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* CTA */}
                <div className="text-center mt-8">
                    <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-orange-400 hover:text-orange-300 transition-colors">
                        Tüm Yazıları Gör →
                    </Link>
                </div>
            </div>
        </section>
    );
}
