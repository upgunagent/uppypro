import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-pro-preview-05-06";

// Simple in-memory rate limiting
const rateLimit = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimit.get(ip);
    if (!entry || now > entry.resetAt) {
        rateLimit.set(ip, { count: 1, resetAt: now + 60000 }); // 1 minute window
        return true;
    }
    if (entry.count >= 5) return false;
    entry.count++;
    return true;
}

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
        if (!checkRateLimit(ip)) {
            return NextResponse.json({ error: "Çok fazla istek gönderildi. Lütfen 1 dakika bekleyin." }, { status: 429 });
        }

        if (!GEMINI_API_KEY) {
            return NextResponse.json({ error: "AI servisi yapılandırılmamış" }, { status: 500 });
        }

        const body = await req.json();
        const { sector, teamSize, problems, extraInfo } = body;

        if (!sector || !teamSize || !problems || problems.length === 0) {
            return NextResponse.json({ error: "Lütfen tüm soruları cevaplayın" }, { status: 400 });
        }

        const prompt = `Sen UppyPro'nun yapay zeka asistanısın. Adın "UppyPro". Kendini her zaman UppyPro olarak tanıt.
Potansiyel müşteriye sıcak, samimi, profesyonel ve ikna edici bir dille konuş. Türkçe yaz.

MÜŞTERİ BİLGİLERİ:
- Sektör: ${sector}
- Çalışan sayısı: ${teamSize}
- Yaşanan sorunlar: ${problems.join(", ")}
- Ek bilgi: ${extraInfo || "Belirtilmedi"}

UPPYPRO PAKETLERİ:

1. **UppyPro Inbox** (₺995/ay + KDV):
   - Instagram + WhatsApp mesajlarını tek panelde yönet
   - CRM / Müşteri Kartı (müşteri profili, not, etiket)
   - Görüşme Özeti (AI ile konuşma özetleri)
   - Takvim (1-10 personel randevu yönetimi)
   - WA Şablon Yönetimi
   - Hazır Cevaplar
   - Metin Düzeltme (AI ile yazım düzeltme)
   - Her Dilde Çeviri (anlık çeviri)
   - ❌ AI Asistan yok (otomatik yanıt yok)

2. **UppyPro AI** (₺3.995/ay + KDV) — En Çok Tercih Edilen:
   - Inbox paketindeki HER ŞEY dahil
   - AI Asistan: İşletmenize özel eğitilmiş yapay zeka 7/24 müşteri mesajlarına otomatik yanıt verir
   - AI Takvim: Yapay zeka müşterilerden randevu alır, takvime ekler, uygunluk kontrolü yapar
   - AI CRM: Müşteri bilgilerini otomatik toplar ve kartı günceller
   - Devral / Devret: İstediğiniz an AI'yı kapatıp sohbeti devralabilir, tekrar devredebilirsiniz
   - 7/24 Yanıt: Mesai dışında bile müşterileriniz cevapsız kalmaz

3. **UppyPro Kurumsal** (Teklif Al):
   - AI paketindeki HER ŞEY dahil
   - Özel otomasyon hizmetleri (iş akışları, entegrasyonlar)
   - Web Widget (web sitenize AI asistan yerleştirme)
   - Özel entegrasyonlar ve yüksek hacim desteği

GÖREV:
1. Müşteriyi sektörüne özel hitap ederek selamla (örn: güzellik salonuysa "Merhaba! 💇‍♀️ Güzellik sektöründe...")
2. Yaşadıkları sorunları anlayışla karşıla ve empati kur
3. EN UYGUN PAKETİ öner — önerini "📦 **Size Önerim: [Paket Adı]**" formatında yaz
4. Bu paketin müşterinin sorunlarını NASIL çözeceğini kendi sektöründen somut senaryolarla anlat
5. Eğer birden fazla paket uygunsa, ana öneriyi yap ama alternatifi de kısaca belirt
6. Sonunda bir CTA ekle: paketin linkine yönlendir

KURALLAR:
- Markdown formatında yaz (bold, emoji, bullet list kullan)
- Samimi ama profesyonel ol, "siz" hitabı kullan
- Maximum 200-250 kelime
- Fiyatları mutlaka belirt
- Sektöre özel gerçekçi senaryolar ver (güzellik salonunda randevu, restoranda rezervasyon, klinikte hasta takibi gibi)
- Asla "yapay zeka" veya "bot" olarak konuşma, bir danışman gibi konuş`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.9,
                        topP: 0.95,
                        maxOutputTokens: 1024,
                    },
                }),
            }
        );

        if (!response.ok) {
            const errText = await response.text();
            console.error("Gemini API error:", errText);
            return NextResponse.json({ error: "AI servisi geçici olarak kullanılamıyor" }, { status: 502 });
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            return NextResponse.json({ error: "AI yanıt üretemedi" }, { status: 500 });
        }

        // Determine recommended package from the response
        let recommendedPackage = "ai"; // default
        const lowerText = text.toLowerCase();
        if (lowerText.includes("kurumsal") && (lowerText.includes("önerim") || lowerText.includes("tavsiyem"))) {
            recommendedPackage = "enterprise";
        } else if (lowerText.includes("inbox") && !lowerText.includes("ai paketi") && (lowerText.includes("önerim") || lowerText.includes("tavsiyem"))) {
            recommendedPackage = "inbox";
        }

        return NextResponse.json({
            success: true,
            recommendation: text,
            recommendedPackage,
        });

    } catch (error: any) {
        console.error("Package recommendation error:", error);
        return NextResponse.json({ error: error.message || "Beklenmeyen hata" }, { status: 500 });
    }
}
