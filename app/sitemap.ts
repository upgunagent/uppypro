import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = "https://www.upgunai.com";

    const sectors = [
        "guzellik-salonu", "klinik-saglik", "otel-konaklama", "restoran-kafe",
        "e-ticaret", "dis-klinigi", "egitim", "emlak", "otomotiv", "sigorta",
        "tekne-yat-kiralama", "villa-apart-kiralama", "studyo-kiralama",
    ];

    const sectorPages = sectors.map((slug) => ({
        url: `${baseUrl}/cozumler/${slug}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.8,
    }));

    const blogSlugs = [
        "whatsapp-business-api-vs-normal-whatsapp",
        "yapay-zeka-musteri-hizmetleri-2026",
        "instagram-dm-satis-donusturme",
        "kucuk-isletmeler-iletisim-otomasyonu",
        "randevu-noshow-orani-dusurme",
        "musteri-sadakati-whatsapp-crm",
    ];

    const blogPages = blogSlugs.map((slug) => ({
        url: `${baseUrl}/blog/${slug}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.7,
    }));

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 1,
        },
        {
            url: `${baseUrl}/blog`,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.9,
        },
        {
            url: `${baseUrl}/hakkimizda`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.8,
        },
        ...sectorPages,
        ...blogPages,
        {
            url: `${baseUrl}/kullanici-sozlesmesi`,
            lastModified: new Date(),
            changeFrequency: "yearly",
            priority: 0.3,
        },
        {
            url: `${baseUrl}/gizlilik-politikasi`,
            lastModified: new Date(),
            changeFrequency: "yearly",
            priority: 0.3,
        },
        {
            url: `${baseUrl}/kvkk-aydinlatma-metni`,
            lastModified: new Date(),
            changeFrequency: "yearly",
            priority: 0.3,
        },
    ];
}
