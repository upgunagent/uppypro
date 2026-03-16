import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-pro";

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

═══════════════════════════════════════
UPPYPRO ÖZELLİK KATEGORİLERİ VE DETAYLARI (Web sitemizdeki özellik açıklamaları)
═══════════════════════════════════════

📬 TEK INBOX — "Müşterileriniz Her Yerde, Siz Tek Ekranda Olun"
- WhatsApp Business'ta kaybolan mesajlar, Instagram DM kutusunda gözden kaçan siparişler ve sürekli uygulama değiştirmekten yorulan ekip... Bu karmaşa müşteri kaybettirir.
- Tüm Kanallar Tek Merkezde: WhatsApp ve Instagram mesajlarını tek bir panelde birleştirin. Artık hiçbir bildirim gözden kaçmaz.
- Yapay Zeka & İnsan İş Birliği: Sıradan bir gelen kutusu değil; akıllı bir asistan. Yapay zekanız müşterileri karşılarken, siz kritik anlarda "Devral" butonuyla sohbete dahil olun.
- Ekip Yönetimi: Personeliniz kişisel telefonlarından değil, kurumsal panelinizden güvenle yanıt versin.
- "Mesaj trafiğini yönetmeyi bırakın, onu satışa dönüştürmeye başlayın."

📅 TAKVİM — "Randevu Süreçlerinizi Otopilota Alın"
- "Ne zaman müsaitsiniz?" döngüsüne ve unutulan randevulara son. Sohbeti saniyeler içinde kesinleşmiş bir randevuya dönüştürür.
- Sohbet İçinde Anında Planlama: Müşteriyle konuşurken tek tıkla randevu oluşturun.
- Otomatik CRM Kaydı: Randevu oluşturulan her müşteri için otomatik "Müşteri Kartı" açılır.
- Akıllı Bildirimler: Randevu kesinleştiğinde onay maili otomatik gider; "gelmedi" (no-show) oranları azalır.
- AI Takvim (sadece AI/Kurumsal): Her personel için ayrı takvim, AI müşteriden uygun gün/saat sorar, otomatik randevu oluşturur, çakışma önler, iptal/değişiklik yönetir.

🤖 AI ASISTAN — "İşletmenizin Hiç Uyumayan En Çalışkan Personeli" (Sadece AI ve Kurumsal)
- Müşteriler saat kaçta yazarsa yazsın, onları karşılayan, tanıyan ve satışa yönlendiren bir asistan.
- 7/24 Kesintisiz Hizmet: Siz uyurken dijital asistanınız Instagram ve WhatsApp'tan gelen soruları saniyeler içinde yanıtlar.
- Tam Yetkili Randevu Yönetimi: Sizin ve ekibinizin ayrı ayrı randevularını oluşturur, değişiklik taleplerini yönetir, iptalleri işler. Çifte rezervasyona izin vermez.
- Satış ve CRM Uzmanı: Müşteriyle sohbet ederken iletişim bilgilerini toplar, otomatik olarak CRM'e kaydeder ve satış hunisine dahil eder.
- İşletmenize Özel Eğitim: Firmanızın kurallarını, fiyatlarını ve dilini öğrenir. Robotik değil, personeliniz gibi doğal konuşur.

📇 MÜŞTERİ KARTI / CRM — "Müşterinizi Tanıyın, Her Sohbeti Satışa Dönüştürün"
- Anında Kimlik Tespiti: Mesaj geldiği an müşteri kartını oluşturun. Instagram profil fotoğrafı ve adı otomatik karta işlenir.
- Kurumsal Hafıza: Müşterinin geçmiş randevularını, satın aldığı hizmetleri, notları ve tarihleri anında görün.
- Otomatik Konuşma Özeti & Akıllı Notlar: "Konuşma Özeti Çıkar" özelliği ile AI otomatik özetini çıkarır, kendi notlarınızı ekleyip kaydedersiniz.
- Bir sonraki görüşmede müşteriye ismiyle hitap edin, tüm işlemlerini görün, ihtiyaçlarına özel öneriler sunun.

🔄 DEVRAL / DEVRET — "Kontrol Sizde, Özgürlük Yapay Zekada" (Sadece AI ve Kurumsal)
- Canlı İzleme: Dijital asistanınızın müşterilerle nasıl satış odaklı konuştuğunu canlı izleyin.
- Tek Tıkla Müdahale: "Devral" butonuna basarak sohbeti AI'dan alın, siz yanıtlayın. İşiniz bitince "Devret" diyerek asistanınıza bırakın.
- Esnek Çalışma Modu: Mesai saatlerinde siz, akşamları AI çalışsın; veya 7/24 AI yönetsin, siz denetleyin.
- Akıllı Yönlendirme: Müşteri ısrarla yetkiliyle görüşmek isterse, AI iletişim bilgilerini alır, not düşer ve size "Müşteri sizi bekliyor" bildirimi gönderir.

📋 WHATSAPP ŞABLONLARI — "İlk Mesajı Siz Atın, Satışınızı Katlayın"
- WhatsApp'ın 24 Saat Kuralına takılmayın! Onaylı şablonlarla yeni müşterilere ulaşın, eski müşterilerinizi kampanyalardan haberdar edin.
- Resmi Meta Onayı: Şablonlar Meta API üzerinden onaylanır, güvenli sınırlar içinde kalırsınız.
- Kişiselleştirilmiş İletişim: Dinamik değişkenlerle müşterinin ismine özel mesajlar gönderin.
- Tek Tıkla Toplu Mesaj: Binlerce kişilik listenize tanıtım ve indirimler gönderin.

💬 HAZIR CEVAPLAR — "Sürekli Aynı Şeyleri Yazmaya Son"
- "Fiyat nedir?", "Konumunuz nerede?" gibi sık sorulan soruları tek tıkla cevaplayın.
- Zengin İçerik Desteği: Sadece metin değil, resim, video ve döküman tanımlayın.
- "/" tuşuna basarak tüm yanıtları aratın, doğru içeriği anında gönderin.
- Ekip çapında standart iletişim sağlayın.

✏️ METİN DÜZELTME & İYİLEŞTİRME — "Profesyonelliğinizi Metinlerinizle Gösterin"
- Yazım ile Noktalama: İmla hatalarını otomatik ayıklar.
- Kurumsal Dile Çevir: "yarın gondeririz" yazdığınızda → "Siparişinizi yarın kargoya teslim etmeyi planlıyoruz, bilginize." formatına çevirir.
- Otomatik Önizleme: Değişikliği panelde görüp tek tıkla gönderirsiniz.

🌍 HER DİLDE ÇEVİRİ — "Tüm Dünya Müşteriniz Olabilir"
- Akıllı Dil Algılama: Müşterinin hangi dilde yazdığını algılar, size Türkçe tercümesiyle gösterir.
- Tek Tıkla Karşı Dilde Yanıt: Kendi dilinizde cevap yazın, müşterinin dilini seçin; sistem anında çevirir.
- 100+ dil desteği: İspanyolca, Fransızca, Arapça, Rusça, Almanca fark etmez.

🔒 GÜVENLİK — "Hesabınızın Güvenliği En Üst Seviyede"
- Bot Savunması (Anti-Spam): Sahte numaralardan gelen spam/bot saldırılarını AI ile anında durdurur.
- Akıllı Aktivite Takibi: Anomali, küfür veya KVKK ihlallerini analiz eder, yöneticilere uyarı gönderir.
- Kurumsal Uçtan Uca Koruma: Tüm müşteri diyalogları şifrelenmiş katmanlar arkasında tutulur.

═══════════════════════════════════════
PAKET ÖZETLERİ VE FİYATLAR
═══════════════════════════════════════

1. **UppyPro Inbox** — ₺995/ay + KDV:
   ✅ Tek Inbox, CRM, Görüşme Özeti, Takvim (1-10 personel), WA Şablon, Hazır Cevaplar, Metin Düzeltme, Çeviri
   ❌ AI Asistan YOK, AI Takvim YOK, AI CRM YOK, Devral/Devret YOK, 7/24 otomatik yanıt YOK
   → En uygun: Mesajlarını kendisi yönetmek isteyen, küçük işletmeler

2. **UppyPro AI** — ₺3.995/ay + KDV (En Çok Tercih Edilen):
   ✅ Inbox'taki HER ŞEY + AI Asistan + AI Takvim + AI CRM + 7/24 Yanıt + Devral/Devret
   → En uygun: Mesajlarını otomatiğe almak, mesai dışında da müşteri kaçırmamak isteyen işletmeler

3. **UppyPro Kurumsal** — Teklif Al:
   ✅ AI'daki HER ŞEY + Özel otomasyon + Web widget + Özel entegrasyon + Yüksek hacim
   → En uygun: 15+ personel, birden fazla şube, özel ihtiyaçları olan büyük işletmeler

═══════════════════════════════════════
GÖREV
═══════════════════════════════════════

1. Müşteriyi sektörüne özel hitap ederek selamla (sektörüne uygun emoji kullan)
2. Yaşadıkları sorunları anlayışla karşıla ve empati kur — "Bu sorunları çok iyi anlıyorum..." tarzında
3. EN UYGUN PAKETİ öner — önerini "📦 **Size Önerim: [Paket Adı]**" formatında yaz
4. Önerdiğin paketin İLGİLİ ÖZELLİKLERİNİ müşterinin sektörüne ve sorunlarına özel somut senaryolarla açıkla
   - "Takvim özelliğiyle stilistlerinizin müsaitlik durumunu AI anında kontrol edecek" gibi
5. Eğer birden fazla paket uygunsa, ana öneriyi yap ama alternatifi de kısaca belirt
6. Sonunda bir CTA ekle:
   - "Hemen **14 günlük ücretsiz deneme** ile Inbox paketini kullanmaya başlayabilirsiniz."
   - Veya AI paketi önerdiysen: "**UppyPro AI** paketini seçerek 48 saat içinde size özel eğitilmiş yapay zeka asistanınızı aktif hale getirebiliriz."
   - ASLA "demo gösterelim", "bir görüşme planlayalım", "detayları görüşelim" gibi ifadeler KULLANMA.
   - Doğrudan harekete geçirici ol: ücretsiz deneme veya paket seçimi yönlendir.

ÖZEL KURAL — OTOMASYON İHTİYACI:
Eğer müşterinin sorunları arasında "Otomasyona ihtiyacımız var" varsa, MUTLAKA şunları vurgula:
- İşletmelerin iş akışına göre özel otomasyon çözümleri ürettiğimizi belirt
- Mevcut paketlerdeki standart özelliklerin ötesinde, firmaya özel birçok otomasyon ekleyerek AI asistanı işletmeye tam uyumlu ve işlevsel hale getirebileceğimizi açıkla
- Örnek otomasyonlar ver: sipariş takibi, stok bildirimi, otomatik faturalandırma, iş akışı tetikleyicileri, özel raporlama, CRM entegrasyonları, webhook bağlantıları gibi
- **UppyPro Kurumsal** paketini MUTLAKA tavsiye et — "Özel otomasyon ihtiyaçlarınız için **UppyPro Kurumsal** paketi tam size göre" şeklinde
- Kurumsal paketin avantajlarını vurgula: özel otomasyon, web widget, özel entegrasyonlar, yüksek hacim desteği, firmaya özel geliştirme

KURALLAR:
- Markdown formatında yaz (bold, emoji, bullet list kullan)
- Samimi ama profesyonel ol, "siz" hitabı kullan
- Maximum 300-500 kelime (konuyu iyi açıkla, kısa kesme)
- Fiyatları mutlaka belirt
- Sektöre özel gerçekçi ve yaratıcı senaryolar ver
- Özellik açıklarken YUKARIDA verilen detaylı özellik bilgilerini KULLAN, kafandan uydurma
- Asla "yapay zeka" veya "bot" olarak konuşma, bir danışman gibi konuş
- ASLA "demo gösterelim", "detayları görüşelim", "uygun bir zaman planlayalım" DEMEYİN — müşteriyi doğrudan ücretsiz denemeye veya paket seçimine yönlendir`;

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
                        maxOutputTokens: 8192,
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
