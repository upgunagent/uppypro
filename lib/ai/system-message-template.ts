/**
 * Sistem Mesajı Oluşturma Sihirbazı - Şablon ve Veri Tanımları
 */

export interface SectorQuestion {
  id: string;
  label: string;
  placeholder: string;
  type: 'text' | 'textarea' | 'select';
  options?: string[];
  required?: boolean;
}

export interface SectorDefinition {
  id: string;
  label: string;
  emoji: string;
  extraQuestions: SectorQuestion[];
}

// Ortak sorular - tüm sektörler için
export const commonQuestions: SectorQuestion[] = [
  { id: 'business_name', label: 'Firma / İşletme Adı', placeholder: 'Örn: Güzellik Salonu Bella', type: 'text', required: true },
  { id: 'website', label: 'Web Sitesi (varsa)', placeholder: 'Örn: www.firmam.com', type: 'text' },
  { id: 'ai_name', label: 'AI Asistanın Adı', placeholder: 'Örn: Bella, Uppy, Asistan', type: 'text', required: true },
  { id: 'working_hours', label: 'Çalışma Saatleri', placeholder: 'Örn: Pzt-Cum 09:00-18:00, Cmt 10:00-16:00', type: 'text', required: true },
  { id: 'contact_info', label: 'İletişim Bilgileri (Tel, Adres)', placeholder: 'Örn: 0212 123 45 67 - Beşiktaş, İstanbul', type: 'text' },
  { id: 'appointment_duration', label: 'Varsayılan Randevu Süresi (dk)', placeholder: 'Örn: 30, 45, 60', type: 'text' },
  { id: 'employees', label: 'Personel Listesi (virgülle ayırın)', placeholder: 'Örn: Ahmet (Kuaför), Ayşe (Güzellik Uzmanı)', type: 'text' },
  { id: 'tone', label: 'İletişim Tonu', placeholder: '', type: 'select', options: ['Samimi ve Sıcak', 'Profesyonel ve Resmi', 'Genç ve Dinamik', 'Lüks ve Prestijli'] },
  { id: 'extra_notes', label: 'Eklemek İstediğiniz Notlar', placeholder: 'Fiyat politikası, özel kurallar, kampanyalar vb.', type: 'textarea' },
];

// Sektör tanımları
export const sectors: SectorDefinition[] = [
  {
    id: 'beauty', label: 'Güzellik & Cilt Bakım Merkezi', emoji: '💆‍♀️',
    extraQuestions: [
      { id: 'services', label: 'Hizmet Listesi', placeholder: 'Örn: Cilt bakımı, manikür, pedikür, kaş tasarımı, kirpik, epilasyon', type: 'textarea', required: true },
      { id: 'price_range', label: 'Fiyat Aralığı', placeholder: 'Örn: Cilt bakımı 500-1500 TL, Manikür 200-400 TL', type: 'textarea' },
    ]
  },
  {
    id: 'spa', label: 'SPA & Masaj Merkezi', emoji: '🧖',
    extraQuestions: [
      { id: 'services', label: 'Hizmetler ve Paketler', placeholder: 'Örn: Klasik masaj, aromaterapi, hamam, wellness paketleri', type: 'textarea', required: true },
      { id: 'price_range', label: 'Fiyat Aralığı', placeholder: 'Örn: Masaj 800-2000 TL, Hamam 500-1000 TL', type: 'textarea' },
    ]
  },
  {
    id: 'tattoo', label: 'Dövme & Tattoo Stüdyosu', emoji: '🎨',
    extraQuestions: [
      { id: 'services', label: 'Hizmetler', placeholder: 'Örn: Dövme, piercing, kalıcı makyaj, cover-up', type: 'textarea', required: true },
      { id: 'consultation_policy', label: 'Danışmanlık Politikası', placeholder: 'Örn: İlk danışmanlık ücretsiz, tasarım süreci vb.', type: 'textarea' },
    ]
  },
  {
    id: 'hotel', label: 'Otel & Konaklama', emoji: '🏨',
    extraQuestions: [
      { id: 'room_types', label: 'Oda Tipleri', placeholder: 'Örn: Standart, Deluxe, Suite, Aile Odası', type: 'textarea', required: true },
      { id: 'checkin_policy', label: 'Giriş-Çıkış Saatleri & İptal Politikası', placeholder: 'Örn: Check-in 14:00, Check-out 12:00, 48 saat öncesine kadar ücretsiz iptal', type: 'textarea' },
      { id: 'amenities', label: 'Olanaklar', placeholder: 'Örn: Havuz, spa, restoran, otopark, Wi-Fi', type: 'textarea' },
    ]
  },
  {
    id: 'hair_salon', label: 'Kuaför & Saç Tasarım', emoji: '✂️',
    extraQuestions: [
      { id: 'services', label: 'Hizmetler', placeholder: 'Örn: Saç kesimi, boya, fön, keratin bakımı, sakal tıraşı', type: 'textarea', required: true },
      { id: 'price_range', label: 'Fiyat Listesi', placeholder: 'Örn: Erkek kesim 200 TL, Bayan kesim+fön 400 TL, Boya 600-1200 TL', type: 'textarea' },
    ]
  },
  {
    id: 'medical_aesthetic', label: 'Medikal Estetik Merkezi', emoji: '💉',
    extraQuestions: [
      { id: 'treatments', label: 'Tedavi ve İşlemler', placeholder: 'Örn: Botox, dolgu, lazer, mezoterapi, PRP, cilt yenileme', type: 'textarea', required: true },
      { id: 'doctor_info', label: 'Doktor/Uzman Bilgisi', placeholder: 'Örn: Dr. Ahmet Yılmaz - Dermatoloji Uzmanı', type: 'text' },
    ]
  },
  {
    id: 'physiotherapy', label: 'Fizyoterapi & Rehabilitasyon', emoji: '🏥',
    extraQuestions: [
      { id: 'treatments', label: 'Tedavi Yöntemleri', placeholder: 'Örn: Manuel terapi, elektroterapi, egzersiz, hidroterapi', type: 'textarea', required: true },
      { id: 'insurance_policy', label: 'Sigorta Politikası', placeholder: 'Örn: SGK anlaşmalı, özel sigorta kabul edilir', type: 'text' },
    ]
  },
  {
    id: 'auto_service', label: 'Oto Servis & Yedek Parça', emoji: '🔧',
    extraQuestions: [
      { id: 'services', label: 'Servis Hizmetleri', placeholder: 'Örn: Bakım, onarım, lastik, oto yıkama, oto elektrik', type: 'textarea', required: true },
      { id: 'vehicle_types', label: 'Kabul Edilen Araç Tipleri', placeholder: 'Örn: Binek, SUV, hafif ticari', type: 'text' },
    ]
  },
  {
    id: 'ecommerce', label: 'E-ticaret & Butik Mağaza', emoji: '🛍️',
    extraQuestions: [
      { id: 'product_categories', label: 'Ürün Kategorileri', placeholder: 'Örn: Giyim, aksesuar, hediyeik, kozmetik', type: 'textarea', required: true },
      { id: 'shipping_policy', label: 'Kargo & İade Politikası', placeholder: 'Örn: 500 TL üzeri ücretsiz kargo, 14 gün iade', type: 'textarea' },
    ]
  },
  {
    id: 'dental', label: 'Diş Kliniği & Diş Hekimi', emoji: '🦷',
    extraQuestions: [
      { id: 'treatments', label: 'Tedaviler', placeholder: 'Örn: Dolgu, kanal tedavisi, implant, ortodonti, diş protez', type: 'textarea', required: true },
      { id: 'emergency_policy', label: 'Acil Durum Politikası', placeholder: 'Örn: 7/24 acil diş hattı mevcut', type: 'text' },
    ]
  },
  {
    id: 'plastic_surgery', label: 'Estetik & Plastik Cerrahi', emoji: '🏥',
    extraQuestions: [
      { id: 'procedures', label: 'İşlemler', placeholder: 'Örn: Burun estetiği, yüz germe, liposuction, meme estetiği', type: 'textarea', required: true },
      { id: 'consultation_info', label: 'Konsültasyon Bilgisi', placeholder: 'Örn: İlk muayene ücretsiz, online konsültasyon mevcut', type: 'text' },
    ]
  },
  {
    id: 'photography', label: 'Fotoğrafçılık & Video', emoji: '📸',
    extraQuestions: [
      { id: 'services', label: 'Hizmetler', placeholder: 'Örn: Düğün fotoğrafı, ürün çekimi, tanıtım videosu, drone', type: 'textarea', required: true },
      { id: 'packages', label: 'Paketler', placeholder: 'Örn: Düğün paketi 15.000 TL, Ürün çekimi 200 TL/adet', type: 'textarea' },
    ]
  },
  {
    id: 'psychology', label: 'Psikoloji & Terapi', emoji: '🧠',
    extraQuestions: [
      { id: 'specializations', label: 'Uzmanlık Alanları', placeholder: 'Örn: Bireysel terapi, çift terapisi, çocuk psikolojisi', type: 'textarea', required: true },
      { id: 'session_info', label: 'Seans Bilgisi', placeholder: 'Örn: 50 dakika, online seans mevcut', type: 'text' },
    ]
  },
  {
    id: 'restaurant', label: 'Restoran & Kafe', emoji: '🍽️',
    extraQuestions: [
      { id: 'cuisine', label: 'Mutfak & Menü Bilgisi', placeholder: 'Örn: Türk mutfağı, İtalyan, kahvaltı, vegan seçenekler', type: 'textarea', required: true },
      { id: 'reservation_policy', label: 'Rezervasyon Politikası', placeholder: 'Örn: Online rezervasyon, minimum 2 kişi, kapora gerekli', type: 'textarea' },
    ]
  },
  {
    id: 'car_rental', label: 'Oto Galeri & Araç Kiralama', emoji: '🚗',
    extraQuestions: [
      { id: 'services', label: 'Hizmetler', placeholder: 'Örn: 2. el satış, kiralama, takas, ekspertiz', type: 'textarea', required: true },
      { id: 'rental_policy', label: 'Kiralama Şartları', placeholder: 'Örn: Ehliyet 2 yıl, depozito, günlük/aylık kiralama', type: 'textarea' },
    ]
  },
  {
    id: 'wedding', label: 'Düğün & Organizasyon', emoji: '💒',
    extraQuestions: [
      { id: 'services', label: 'Hizmetler', placeholder: 'Örn: Düğün organizasyonu, nişan, kına, parti, kurumsal etkinlik', type: 'textarea', required: true },
      { id: 'capacity', label: 'Kapasite & Mekan Bilgisi', placeholder: 'Örn: 50-500 kişilik salonlar, açık hava seçeneği', type: 'textarea' },
    ]
  },
  {
    id: 'dietitian', label: 'Diyetisyen & Beslenme', emoji: '🥗',
    extraQuestions: [
      { id: 'services', label: 'Hizmetler', placeholder: 'Örn: Kilo verme, sporcu beslenmesi, hamilelik diyeti', type: 'textarea', required: true },
      { id: 'session_format', label: 'Görüşme Formatı', placeholder: 'Örn: Yüz yüze ve online, ilk görüşme 60 dk, kontrol 30 dk', type: 'text' },
    ]
  },
  {
    id: 'accounting', label: 'Muhasebe & Mali Müşavirlik', emoji: '📊',
    extraQuestions: [
      { id: 'services', label: 'Hizmetler', placeholder: 'Örn: Defter tutma, vergi danışmanlığı, şirket kuruluş, SGK işlemleri', type: 'textarea', required: true },
      { id: 'client_types', label: 'Müşteri Tipleri', placeholder: 'Örn: Şahıs firmaları, limited, anonim şirketler', type: 'text' },
    ]
  },
  {
    id: 'real_estate', label: 'Emlak Ofisi', emoji: '🏠',
    extraQuestions: [
      { id: 'services', label: 'Hizmetler', placeholder: 'Örn: Satılık, kiralık, gayrimenkul danışmanlığı', type: 'textarea', required: true },
      { id: 'regions', label: 'Hizmet Bölgeleri', placeholder: 'Örn: İstanbul Avrupa yakası, Beşiktaş, Şişli, Kadıköy', type: 'text' },
    ]
  },
  {
    id: 'education', label: 'Eğitim & Kurs Merkezi', emoji: '📚',
    extraQuestions: [
      { id: 'courses', label: 'Kurslar / Eğitimler', placeholder: 'Örn: İngilizce, müzik, dans, yazılım, özel ders', type: 'textarea', required: true },
      { id: 'age_groups', label: 'Yaş Grupları', placeholder: 'Örn: Çocuk (5-12), Genç (13-18), Yetişkin', type: 'text' },
    ]
  },
  {
    id: 'fitness', label: 'Spor & Fitness', emoji: '🏋️',
    extraQuestions: [
      { id: 'services', label: 'Hizmetler', placeholder: 'Örn: Fitness, pilates, yoga, yüzme, CrossFit, PT', type: 'textarea', required: true },
      { id: 'membership_info', label: 'Üyelik Bilgisi', placeholder: 'Örn: Aylık 1500 TL, yıllık 12000 TL, PT ek ücret', type: 'textarea' },
    ]
  },
  {
    id: 'veterinary', label: 'Veteriner & Pet', emoji: '🐾',
    extraQuestions: [
      { id: 'services', label: 'Hizmetler', placeholder: 'Örn: Muayene, aşı, ameliyat, diş temizliği, tıraş', type: 'textarea', required: true },
      { id: 'pet_types', label: 'Kabul Edilen Hayvanlar', placeholder: 'Örn: Kedi, köpek, kuş, egzotik hayvanlar', type: 'text' },
    ]
  },
  {
    id: 'law', label: 'Hukuk & Avukatlık', emoji: '⚖️',
    extraQuestions: [
      { id: 'practice_areas', label: 'Uzmanlık Alanları', placeholder: 'Örn: İş hukuku, aile hukuku, ceza hukuku, ticaret hukuku', type: 'textarea', required: true },
      { id: 'consultation_fee', label: 'Danışmanlık Ücreti', placeholder: 'Örn: İlk görüşme ücretsiz, saat başı 2000 TL', type: 'text' },
    ]
  },
  {
    id: 'cleaning', label: 'Temizlik & Ev Hizmetleri', emoji: '🧹',
    extraQuestions: [
      { id: 'services', label: 'Hizmetler', placeholder: 'Örn: Ev temizliği, ofis temizliği, tadilat sonrası, halı yıkama', type: 'textarea', required: true },
      { id: 'pricing_model', label: 'Fiyatlandırma Modeli', placeholder: 'Örn: Saatlik 250 TL, günlük 1500 TL', type: 'text' },
    ]
  },
  {
    id: 'printing', label: 'Matbaa & Reklam', emoji: '🖨️',
    extraQuestions: [
      { id: 'services', label: 'Hizmetler', placeholder: 'Örn: Kartvizit, broşür, tabela, dijital baskı', type: 'textarea', required: true },
      { id: 'min_order', label: 'Minimum Sipariş', placeholder: 'Örn: Min 100 adet kartvizit, 50 adet broşür', type: 'text' },
    ]
  },
  {
    id: 'optics', label: 'Optik & Gözlükçü', emoji: '👓',
    extraQuestions: [
      { id: 'services', label: 'Hizmetler', placeholder: 'Örn: Göz muayenesi, numaralı gözlük, lens, güneş gözlüğü', type: 'textarea', required: true },
      { id: 'brands', label: 'Markalar', placeholder: 'Örn: Ray-Ban, Oakley, Essilor lensler', type: 'text' },
    ]
  },
  {
    id: 'florist', label: 'Çiçekçi & Peyzaj', emoji: '💐',
    extraQuestions: [
      { id: 'services', label: 'Hizmetler', placeholder: 'Örn: Buket, aranjman, çelenk, düğün çiçeği, peyzaj', type: 'textarea', required: true },
      { id: 'delivery_info', label: 'Teslimat Bilgisi', placeholder: 'Örn: Aynı gün teslimat, şehir içi ücretsiz', type: 'text' },
    ]
  },
  {
    id: 'architecture', label: 'Mimarlık & İç Mimarlık', emoji: '🏗️',
    extraQuestions: [
      { id: 'services', label: 'Hizmetler', placeholder: 'Örn: İç mimarlık, dekorasyon, proje çizimi, 3D tasarım', type: 'textarea', required: true },
      { id: 'project_types', label: 'Proje Türleri', placeholder: 'Örn: Konut, ofis, restoran, otel renovasyonu', type: 'text' },
    ]
  },
  {
    id: 'pharmacy', label: 'Eczane', emoji: '💊',
    extraQuestions: [
      { id: 'services', label: 'Ek Hizmetler', placeholder: 'Örn: Tansiyon ölçümü, şeker ölçümü, dermokozmetik danışmanlık', type: 'textarea' },
      { id: 'nöbet_info', label: 'Nöbet Bilgisi', placeholder: 'Örn: Nöbet günleri web sitesinde yayınlanır', type: 'text' },
    ]
  },
  {
    id: 'other', label: 'Diğer Sektör', emoji: '🏢',
    extraQuestions: [
      { id: 'sector_name', label: 'Sektörünüzü Belirtin', placeholder: 'Örn: Sigorta acentesi, turizm acentası', type: 'text', required: true },
      { id: 'services', label: 'Hizmetleriniz', placeholder: 'Sunduğunuz hizmetleri detaylı yazın', type: 'textarea', required: true },
    ]
  },
];

// Sabit Tool Kuralları Bloğu - Her sektörde aynı kalır
export const FIXED_TOOL_RULES = `
## Takvim / Randevu Yönetimi Kuralları
- Müşteri randevu almak istediğinde önce tarih, saat ve hizmet türünü sor.
- Randevu oluşturmadan ÖNCE mutlaka check_availability tool'u ile personelin o tarihte müsait olup olmadığını kontrol et.
- Müsait saatleri müşteriye sun ve seçim yapmasını bekle.
- Asla müsaitlik kontrolü yapmadan randevu önerme veya oluşturma.
- Randevu oluşturulduktan sonra mutlaka mail_gonder tool'u ile müşteriye onay maili gönder.
- İptal ve tarih değişikliklerinde de mail_gonder ile bilgilendirme maili gönder.
- Randevu tarih/saatini YYYY-MM-DD HH:MM formatında gönder.

## Kayıtlı Müşteri Kuralları
- Eğer sistem notu ile müşteri bilgileri (isim, telefon, e-posta vb.) geldiyse bu bilgileri tanı ve kullan.
- Müşteriyi ismiyle hitap et.
- Bilgilerin doğru olup olmadığını müşteriye teyit ettir.
- Müşteri bilgi güncelleme isterse update_customer tool'unu kullan.

## Canlı Destek Eskalasyonu
- Müşteri "canlı destek", "yetkili ile görüşmek istiyorum", "insan temsilci" gibi ifadeler kullanırsa notify_human_agent tool'unu çağır.
- Senin çözemediğin teknik konularda veya şikayet durumlarında da eskalasyon yap.
- Eskalasyon yaparken konuşmanın kısa bir özetini summary alanında belirt.

## Genel İletişim Kuralları
- Müşteriye hangi dilde yazılırsa o dilde cevap ver (Türkçe, İngilizce, Almanca vb.).
- Kısa, net ve yardımcı yanıtlar ver.
- Uygun yerlerde emoji kullan ama abartma.
- KVKK ve gizlilik konularında hassas ol, kişisel veriyi gereksiz yere paylaşma.

## Görsel Mesajlar
- Müşteri bir görsel (fotoğraf, ekran görüntüsü vb.) gönderdiğinde görseli analiz et ve müşteriye yardımcı ol.
- Ürün fotoğrafı ise: ürünü tanımla, bilgi ver
- Ekran görüntüsü ise: sorunu anla, çözüm öner
- "Göremiyorum" deme, görseli incele ve yanıt ver.
`.trim();

// Gemini'ye gönderilen meta-prompt (üretim talimatı)
export function buildGenerationPrompt(
  sectorLabel: string,
  answers: Record<string, string>
): string {
  const answerLines = Object.entries(answers)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  return `Sen bir AI asistan sistem mesajı oluşturma uzmanısın. Aşağıdaki bilgilere göre bir işletmenin WhatsApp ve Instagram üzerinden müşterilerle iletişim kuracak AI asistanı için kapsamlı ve profesyonel bir sistem mesajı oluştur.

## SEKTÖR: ${sectorLabel}

## İŞLETME BİLGİLERİ:
${answerLines}

## TALİMATLAR:
1. Sistem mesajını Türkçe yaz.
2. Mesaj, AI asistanın kimlik tanımıyla başlasın (adı, hangi firmada çalıştığı, ne yaptığı).
3. Firmanın hizmetlerini, çalışma saatlerini ve iletişim bilgilerini net olarak belirt.
4. İletişim tonunu kullanıcının belirttiği tarza göre ayarla.
5. Sektöre özel bilgileri (hizmet listesi, fiyatlar, politikalar) detaylı şekilde dahil et.
6. Personel listesi verildiyse hangi personelin hangi hizmeti verdiğini belirt.
7. Mesajın sonuna aşağıdaki SABİT TOOL KURALLARINI ekle — bu kuralları DEĞİŞTİRME, aynen ekle:

---
${FIXED_TOOL_RULES}
---

8. Sadece sistem mesajını üret, başka bir açıklama veya yorum ekleme.
9. Mesaj en az 800, en fazla 2000 kelime olsun.
`;
}
