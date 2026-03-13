import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CATALOG_PATH = path.join(process.cwd(), "public", "asset-catalog.json");

// UppyPro public assets (on www.upgunai.com domain)
const BRAND_ASSETS = {
    logo: "https://www.upgunai.com/brand-logo.png",
    logoWithText: "https://www.upgunai.com/brand-logo-text.png",
    logoSmall: "https://www.upgunai.com/uppy-logo-small.png",
    whatsappIcon: "https://www.upgunai.com/whatsapp_ikon.png",
    instagramIcon: "https://www.upgunai.com/instagram_ikon.png",
    metaPartner: "https://www.upgunai.com/meta-partner-badge.png",
    website: "https://www.upgunai.com",
};

// Sector-specific features and value propositions
const SECTOR_CONTEXT: Record<string, { benefits: string[]; cta: string; tone: string }> = {
    "Kuaför & Saç Tasarım": {
        benefits: [
            "WhatsApp'tan 7/24 otomatik randevu alma",
            "Instagram DM'den gelen müşteri mesajlarını tek panelden yönetme",
            "AI asistan ile müşteri sorularına anında yanıt",
            "Çoklu personel takvimi: 1-10 çalışan için ayrı ayrı takvim oluşturma, hem manuel hem AI asistan yardımıyla otomatik randevu oluşturma, değişiklik ve iptal yapabilme",
            "Yazım hatalarını otomatik düzeltme ve mesajları tek tuşla kurumsal dile çevirme",
            "Her dilde anlık çeviri ile yabancı müşterilerle akıcı iletişim kurma",
            "Müşteri geçmişi ve sadakat takibi"
        ],
        cta: "Ücretsiz Demo ile randevu sisteminizi kurun",
        tone: "Samimi, enerjik, modern"
    },
    "Güzellik & Cilt Bakım Merkezi": {
        benefits: [
            "WhatsApp üzerinden otomatik randevu ve bilgilendirme",
            "Instagram DM mesajlarını kaçırmadan yanıtlama",
            "AI ile tedavi önerileri ve fiyat bilgilendirme",
            "Çoklu personel takvimi: 1-10 uzman için ayrı ayrı takvim oluşturma, hem manuel hem AI asistan yardımıyla otomatik randevu oluşturma, değişiklik ve iptal yapabilme",
            "Yazım hatalarını otomatik düzeltme ve mesajları tek tuşla kurumsal dile çevirme",
            "Her dilde anlık çeviri ile yabancı müşterilerle akıcı iletişim kurma",
            "VIP müşteri takibi ve CRM"
        ],
        cta: "Ücretsiz deneyin, müşterilerinizi kaybetmeyin",
        tone: "Şık, profesyonel, güven veren"
    },
    "SPA & Masaj Merkezi": {
        benefits: [
            "WhatsApp'tan 7/24 rezervasyon kabul etme",
            "Paket ve fiyat bilgilerini otomatik paylaşma",
            "Müşteri memnuniyetini artıran hızlı iletişim",
            "Çoklu personel takvimi: 1-10 terapist için ayrı ayrı takvim oluşturma, hem manuel hem AI asistan yardımıyla otomatik randevu oluşturma, değişiklik ve iptal yapabilme",
            "Yazım hatalarını otomatik düzeltme ve mesajları tek tuşla kurumsal dile çevirme",
            "Her dilde anlık çeviri ile yabancı müşterilerle akıcı iletişim kurma",
            "Sadık müşteri takibi"
        ],
        cta: "Hemen deneyin, rezervasyonlarınızı artırın",
        tone: "Huzurlu, lüks, profesyonel"
    },
    "Dövme & Tattoo Stüdyosu": {
        benefits: [
            "Instagram DM'lerden gelen tasarım taleplerini yönetin",
            "WhatsApp'tan otomatik randevu ve fiyat bilgisi verin",
            "AI asistan ile sık sorulan soruları anında yanıtlayın",
            "Çoklu sanatçı takvimi: 1-10 sanatçı için ayrı ayrı takvim oluşturma, hem manuel hem AI asistan yardımıyla otomatik randevu oluşturma, değişiklik ve iptal yapabilme",
            "Yazım hatalarını otomatik düzeltme ve mesajları tek tuşla kurumsal dile çevirme",
            "Her dilde anlık çeviri ile yabancı müşterilerle akıcı iletişim kurma",
            "Portföy paylaşımı ve müşteri onay süreci"
        ],
        cta: "Ücretsiz deneyin, stüdyonuzu dijitalleştirin",
        tone: "Yaratıcı, modern, cool"
    },
    "Diş Kliniği & Diş Hekimi": {
        benefits: [
            "WhatsApp'tan 7/24 randevu alma ve hatırlatma",
            "Hasta sorularına AI ile anında yanıt",
            "Tedavi bilgilendirme ve fiyat paylaşımı",
            "Çoklu hekim takvimi: 1-10 diş hekimi için ayrı ayrı takvim oluşturma, hem manuel hem AI asistan yardımıyla otomatik randevu oluşturma, değişiklik ve iptal yapabilme",
            "Yazım hatalarını otomatik düzeltme ve mesajları tek tuşla kurumsal dile çevirme",
            "Her dilde anlık çeviri ile yabancı hastalarla akıcı iletişim kurma",
            "Dijital hasta takip ve CRM sistemi"
        ],
        cta: "Ücretsiz demo ile kliniğinizi dijitalleştirin",
        tone: "Güvenilir, profesyonel, sağlık odaklı"
    },
    "Estetik & Plastik Cerrahi": {
        benefits: [
            "Hasta danışmanlığını WhatsApp'tan yönetme",
            "Instagram DM'den gelen talepleri profesyonelce yönetme",
            "Randevu ve operasyon takvimi yönetimi",
            "Çoklu doktor takvimi: 1-10 uzman için ayrı ayrı takvim oluşturma, hem manuel hem AI asistan yardımıyla otomatik randevu oluşturma, değişiklik ve iptal yapabilme",
            "Yazım hatalarını otomatik düzeltme ve mesajları tek tuşla kurumsal dile çevirme",
            "Her dilde anlık çeviri ile yurt dışı hastalarla akıcı iletişim kurma",
            "Gizlilik odaklı güvenli iletişim"
        ],
        cta: "Ücretsiz demo talep edin",
        tone: "Prestijli, güven veren, tıbbi"
    },
    "Medikal Estetik Merkezi": {
        benefits: [
            "WhatsApp'tan randevu ve tedavi bilgilendirme",
            "Instagram DM mesajlarını kaçırmadan yanıtlama",
            "AI ile tedavi önerileri ve sık sorulan sorulara otomatik yanıt",
            "Çoklu uzman takvimi: 1-10 uzman için ayrı ayrı takvim oluşturma, hem manuel hem AI asistan yardımıyla otomatik randevu oluşturma, değişiklik ve iptal yapabilme",
            "Yazım hatalarını otomatik düzeltme ve mesajları tek tuşla kurumsal dile çevirme",
            "Her dilde anlık çeviri ile yabancı hastalarla akıcı iletişim kurma",
            "Kampanya ve indirim duyuruları"
        ],
        cta: "Ücretsiz deneyin, hasta memnuniyetinizi artırın",
        tone: "Modern, güvenilir, yenilikçi"
    }
};

function getDefaultContext(sectorName: string) {
    return SECTOR_CONTEXT[sectorName] || {
        benefits: [
            "WhatsApp ve Instagram mesajlarını tek panelden yönetme",
            "AI asistan ile 7/24 otomatik müşteri yanıtlama",
            "Çoklu personel takvimi: 1-10 çalışan için ayrı ayrı takvim oluşturma, hem manuel hem AI asistan yardımıyla otomatik randevu oluşturma, değişiklik ve iptal yapabilme",
            "Yazım hatalarını otomatik düzeltme ve mesajları tek tuşla kurumsal dile çevirme",
            "Her dilde anlık çeviri ile yabancı müşterilerle akıcı iletişim kurma",
            "Müşteri takibi ve CRM",
            "Hazır cevaplar ile hızlı iletişim"
        ],
        cta: "Ücretsiz demo ile deneyin",
        tone: "Profesyonel, samimi"
    };
}

// Load pre-analyzed asset catalog and format for prompt
function getAssetCatalogForPrompt(): string {
    try {
        if (fs.existsSync(CATALOG_PATH)) {
            const data = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf-8"));
            const assets = data.assets || [];
            if (assets.length === 0) return "- Ek görsel katalogu henüz oluşturulmamış";

            const lines = assets.map((a: any) =>
                `  * ${a.url} — ${a.description} (${a.dimensions}, Kullanım: ${a.suggestedUse})`
            ).join("\n");

            return `- İhtiyaç duyarsan kullanabileceğin analiz edilmiş görseller:\n${lines}`;
        }
    } catch { /* ignore */ }
    return `- Ek görseller:
  * ${BRAND_ASSETS.whatsappIcon} — WhatsApp ikonu (24px)
  * ${BRAND_ASSETS.instagramIcon} — Instagram ikonu (24px)
  * ${BRAND_ASSETS.metaPartner} — Meta İş Ortağı rozeti (100px)`;
}

export async function POST(req: NextRequest) {
    try {
        // Auth check
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: membership } = await supabase
            .from("tenant_members")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "agency_admin")
            .maybeSingle();

        if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const body = await req.json();
        const { sectorName, sectorDescription, customInstructions, existingHtml, imageGallery } = body;

        if (!sectorName) {
            return NextResponse.json({ error: "sectorName gerekli" }, { status: 400 });
        }

        if (!GEMINI_API_KEY) {
            return NextResponse.json({ error: "GEMINI_API_KEY yapılandırılmamış" }, { status: 500 });
        }

        const sectorCtx = getDefaultContext(sectorName);
        let prompt: string;

        if (existingHtml && customInstructions) {
            // ========== ITERATIVE EDITING MODE ==========
            console.log(`[EDIT MODE] Command: "${customInstructions}" | HTML length: ${existingHtml.length}`);
            
            prompt = `Sen bir profesyonel HTML e-posta düzenleme uzmanısın.

ÖNEMLİ: Aşağıdaki mevcut HTML e-posta şablonunda admin'in istediği DEĞİŞİKLİKLERİ MUTLAKA UYGULA. Değişiklikleri yapmadan aynı HTML'i döndürme!

MEVCUT HTML ŞABLONU:
${existingHtml}

ADMİN'İN KOMUT/İSTEĞİ:
"${customInstructions}"

${imageGallery && imageGallery.length > 0 ? `GÖRSEL DEPOSU (Admin komutunda bahsettiği görselleri açıklamalarına göre eşleştirip kullan):
${imageGallery.map((img: any) => `- "${img.description}" → ${img.url}`).join("\n")}

Admin komutunda bir görselden bahsediyorsa, açıklamaya göre doğru görseli bul ve img tag ile HTML'e ekle.` : ""}

KURALLAR:
1. Admin'in istediği değişiklikleri MUTLAKA uygula. Örnek:
   - "Logoyu büyüt" → img tag'inin width değerini artır (örn: 160px → 220px)
   - "Rengi değiştir" → ilgili inline style'daki renk kodunu değiştir
   - "Başlığı değiştir" → ilgili metin içeriğini güncelle
   - "Bu görseli ekle" → depodaki görseli uygun yere img tag ile ekle
2. Değiştirilmeyen kısımları AYNEN bırak, sadece istenen yeri değiştir
3. SADECE inline CSS kullan (style="..." attribute), <style> tagı KULLANMA
4. Responsive tasarımı koru
5. SADECE güncellenmiş tam HTML kodunu döndür - açıklama, yorum, markdown YAZMA
6. <!DOCTYPE html> ile başla
7. Türkçe içerik kullan

TEKRAR: Komutu uygulamadan aynı HTML'i döndürmek KABUL EDİLEMEZ. Mutlaka değişikliği yap!`;
        } else {
            // ========== NEW TEMPLATE GENERATION ==========
            prompt = `Sen dünya standartlarında e-posta pazarlama şablonları oluşturan bir uzman tasarımcısın. 

"${sectorName}" sektöründeki işletme sahiplerine UppyPro'yu tanıtan profesyonel bir HTML e-posta şablonu oluştur.

SEKTÖR: ${sectorName}
${sectorDescription ? `SEKTÖR DETAYI: ${sectorDescription}` : ""}
SEKTÖR TONU: ${sectorCtx.tone}
${customInstructions ? `ÖZEL TALİMATLAR: ${customInstructions}` : ""}

UppyPro NEDİR:
UppyPro, işletmelerin WhatsApp, Instagram DM ve diğer mesajlaşma kanallarını tek bir panelden yönetmesini sağlayan, yapay zeka destekli müşteri iletişim platformudur. Website: ${BRAND_ASSETS.website}

BU SEKTÖRE ÖZEL FAYDALARI:
${sectorCtx.benefits.map((b, i) => `${i + 1}. ${b}`).join("\n")}

ÇAĞRI EYLEM: ${sectorCtx.cta}

KULLANILABİLECEK GÖRSELLER:
- UppyPro Logosu (MUTLAKA kullan): ${BRAND_ASSETS.logoWithText} (genişlik: 160px, header'da her zaman kullan)
- Footer'da küçük logo: ${BRAND_ASSETS.logoSmall} (genişlik: 36px)
${getAssetCatalogForPrompt()}
- Öncelikli olarak HTML/CSS tabanlı görseller üret (emoji + renkli kutular, CSS şekiller)
- Emoji karakterleri kullan (✅ 📱 💬 📅 🤖 ⭐ vb.)
- İkon kutuları için CSS ile renkli daire/kare background + emoji tercih et
- İhtiyaç duyduğunda yukarıdaki katalogdan uygun görselleri img tag ile kullanabilirsin

TASARIM KURALLARI:
1. <!DOCTYPE html> ile başla, tam HTML dokümanı oluştur
2. SADECE inline CSS kullan (style="..." attribute). <style> tagı ASLA KULLANMA. External stylesheet KULLANMA. Outlook conditional comment KULLANMA. XML namespace KULLANMA. Sadece sade, temiz HTML + inline style kullan.
3. Responsive: max-width: 600px, mobil uyumlu
4. Renk paleti:
   - Ana renk: #ea580c (turuncu, CTA butonları ve vurgular)
   - İkincil: #f97316 (açık turuncu, gradyan)
   - Başlık metni: #1e293b (koyu lacivert)
   - Gövde metni: #475569 (gri)
   - Arka plan: #f8fafc (açık gri)
   - Kart arka plan: #ffffff (beyaz)
5. Header: UppyPro logosu (logoWithText img, 160px genişlik) + turuncu arka plan şerit
6. Hero bölümü: Sektöre özel dikkat çekici başlık + kısa açıklama
7. Fayda listesi: Her faydayı emoji ile süslenmiş kartlar/kutular şeklinde göster (HTML/CSS ile oluştur)
8. CTA butonu: Büyük, belirgin turuncu buton (#ea580c), rounded, padding: 14px 32px
9. Güven unsurları: HTML/CSS ile oluşturulmuş rozetler (örn: ✅ 7/24 Destek, 🚀 Ücretsiz Kurulum, 🤝 Meta İş Ortağı)
10. Footer: UppyPro küçük logo, website linki, iletişim bilgileri
11. Alt: "Bu e-postayı almak istemiyorsanız buraya tıklayın" opt-out placeholder

İÇERİK KURALLARI:
- Türkçe, akıcı, profesyonel dil
- İşletme sahibine doğrudan hitap et ("Siz" kullan)
- Kısa paragraflar, okunabilir yapı
- Sektöre özel terminoloji kullan
- Acele ettirmeyen ama ilgi uyandıran ton
${imageGallery && imageGallery.length > 0 ? `
GÖRSEL DEPOSU (İhtiyaç duyduğun görselleri açıklamalarına göre kullan):
${imageGallery.map((img: any) => `- "${img.description}" → ${img.url}`).join("\n")}

Komutta veya şablon içeriğinde bu görsellerden biri gerekiyorsa, açıklamaya göre doğru olanı seç ve <img> tag ile ekle.` : ""}

ÇIKTI FORMATI:
İlk satırda SUBJECT: ile konu satırını yaz.
Sonra boş satır bırak.
Sonra tam HTML kodunu yaz.
Başka hiçbir açıklama, yorum veya markdown formatı EKLEME.`;
        }

        // Call Gemini API - try multiple models
        const models = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"];
        let geminiData: any = null;
        let lastError = "";

        for (const model of models) {
            try {
                const geminiRes = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: [{
                                parts: [{ text: prompt }]
                            }],
                            generationConfig: {
                                temperature: 0.7,
                                maxOutputTokens: 8192,
                            }
                        })
                    }
                );

                if (geminiRes.ok) {
                    geminiData = await geminiRes.json();
                    if (geminiData?.candidates?.[0]?.content?.parts?.[0]?.text) {
                        break; // Success
                    }
                } else {
                    lastError = await geminiRes.text();
                    console.error(`Gemini ${model} error:`, lastError);
                }
            } catch (err: any) {
                lastError = err.message;
                console.error(`Gemini ${model} fetch error:`, err.message);
            }
        }

        const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) {
            return NextResponse.json({
                error: `AI servisi yanıt vermedi. Detay: ${lastError.substring(0, 200)}`
            }, { status: 502 });
        }

        // Parse subject and HTML
        let subject = "";
        let htmlContent = rawText;

        // Extract subject if present
        const subjectMatch = rawText.match(/^SUBJECT:\s*(.+)/m);
        if (subjectMatch) {
            subject = subjectMatch[1].trim();
            htmlContent = rawText.replace(/^SUBJECT:\s*.+\n*/m, "").trim();
        }

        // Clean up markdown code blocks if Gemini wraps them
        htmlContent = htmlContent.replace(/^```html?\n?/i, "").replace(/\n?```$/i, "").trim();

        return NextResponse.json({
            success: true,
            subject,
            htmlContent,
            isEdit: !!existingHtml
        });

    } catch (error: any) {
        console.error("Generate email error:", error);
        return NextResponse.json({ error: error.message || "Beklenmeyen hata" }, { status: 500 });
    }
}
