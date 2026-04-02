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
  iconName: string;
  extraQuestions: SectorQuestion[];
  /** Ortak soruların placeholder'larını sektöre göre özelleştirir */
  placeholderOverrides?: Record<string, string>;
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
    id: 'beauty', label: 'Güzellik & Cilt Bakım Merkezi', iconName: 'Sparkles',
    placeholderOverrides: {
      business_name: 'Örn: Bella Güzellik Merkezi',
      ai_name: 'Örn: Bella, Liya, Asistan',
      working_hours: 'Örn: Pzt-Cmt 10:00-20:00, Pazar Kapalı',
      contact_info: 'Örn: 0212 555 12 34 - Nişantaşı, İstanbul',
      appointment_duration: 'Örn: 45, 60, 90',
      duration_hint: 'Cilt bakımı (60 dk), Manikür (45 dk), Epilasyon (30 dk)',
      employees: 'Örn: Selin (Cilt Bakım), Merve (Manikür), Elif (Epilasyon)',
    },
    extraQuestions: [
      { id: 'services', label: 'Hizmet Listesi', placeholder: 'Örn: Cilt bakımı, manikür, pedikür, kaş tasarımı, kirpik, epilasyon', type: 'textarea', required: true },
      { id: 'price_range', label: 'Fiyat Aralığı', placeholder: 'Örn: Cilt bakımı 500-1500 TL, Manikür 200-400 TL', type: 'textarea' },
    ]
  },
  {
    id: 'spa', label: 'SPA & Masaj Merkezi', iconName: 'Leaf',
    placeholderOverrides: {
      business_name: 'Örn: Zen SPA & Wellness',
      ai_name: 'Örn: Zen, Huzur, Asistan',
      working_hours: 'Örn: Her gün 10:00-22:00',
      appointment_duration: 'Örn: 60, 90, 120',
      duration_hint: 'Klasik masaj (60 dk), Aromaterapi (90 dk), VIP paket (120 dk)',
      employees: 'Örn: Aylin (Masöz), Kemal (Hamam), Deniz (Aromaterapi)',
    },
    extraQuestions: [
      { id: 'services', label: 'Hizmetler ve Paketler', placeholder: 'Örn: Klasik masaj, aromaterapi, hamam, wellness paketleri', type: 'textarea', required: true },
      { id: 'price_range', label: 'Fiyat Aralığı', placeholder: 'Örn: Masaj 800-2000 TL, Hamam 500-1000 TL', type: 'textarea' },
    ]
  },
  {
    id: 'tattoo', label: 'Dövme & Tattoo Stüdyosu', iconName: 'Pen',
    placeholderOverrides: {
      business_name: 'Örn: Ink Art Tattoo Studio',
      ai_name: 'Örn: Ink, Art, Asistan',
      working_hours: 'Örn: Sal-Cmt 12:00-21:00',
      appointment_duration: 'Örn: 60, 120, 180',
      duration_hint: 'Piercing (30 dk), Küçük dövme (60 dk), Büyük dövme (180 dk)',
      employees: 'Örn: Kaan (Dövme Sanatçısı), Ece (Piercing), Zeynep (Kalıcı Makyaj)',
    },
    extraQuestions: [
      { id: 'services', label: 'Hizmetler', placeholder: 'Örn: Dövme, piercing, kalıcı makyaj, cover-up', type: 'textarea', required: true },
      { id: 'consultation_policy', label: 'Danışmanlık Politikası', placeholder: 'Örn: İlk danışmanlık ücretsiz, tasarım süreci vb.', type: 'textarea' },
    ]
  },
  {
    id: 'hotel', label: 'Otel & Konaklama', iconName: 'Building2',
    placeholderOverrides: {
      business_name: 'Örn: Grand Palace Hotel',
      ai_name: 'Örn: Concierge, Asistan',
      working_hours: 'Örn: 7/24 Resepsiyon',
      appointment_duration: 'Örn: Gecelik konaklama',
      duration_hint: 'Standart konaklama (1 gece), Spa paketi (2 saat)',
      employees: 'Örn: Resepsiyon ekibi, Housekeeping',
    },
    extraQuestions: [
      { id: 'room_types', label: 'Oda Tipleri', placeholder: 'Örn: Standart, Deluxe, Suite, Aile Odası', type: 'textarea', required: true },
      { id: 'checkin_policy', label: 'Giriş-Çıkış Saatleri & İptal Politikası', placeholder: 'Örn: Check-in 14:00, Check-out 12:00, 48 saat öncesine kadar ücretsiz iptal', type: 'textarea' },
      { id: 'amenities', label: 'Olanaklar', placeholder: 'Örn: Havuz, spa, restoran, otopark, Wi-Fi', type: 'textarea' },
    ]
  },
  {
    id: 'hair_salon', label: 'Kuaför & Saç Tasarım', iconName: 'Scissors',
    placeholderOverrides: {
      business_name: 'Örn: Studio Hair Design',
      ai_name: 'Örn: Stil, Bella, Asistan',
      working_hours: 'Örn: Pzt-Cmt 09:00-20:00, Pazar 10:00-18:00',
      appointment_duration: 'Örn: 30 (kesim), 60 (boya), 90 (özel bakım)',
      duration_hint: 'Saç kesimi (30 dk), Boya (60 dk), Keratin bakımı (90 dk)',
      employees: 'Örn: Mehmet (Erkek Kuaför), Ayşe (Bayan Kuaför), Seda (Boya Uzmanı)',
    },
    extraQuestions: [
      { id: 'services', label: 'Hizmetler', placeholder: 'Örn: Saç kesimi, boya, fön, keratin bakımı, sakal tıraşı', type: 'textarea', required: true },
      { id: 'price_range', label: 'Fiyat Listesi', placeholder: 'Örn: Erkek kesim 200 TL, Bayan kesim+fön 400 TL, Boya 600-1200 TL', type: 'textarea' },
    ]
  },
  {
    id: 'medical_aesthetic', label: 'Medikal Estetik Merkezi', iconName: 'Syringe',
    placeholderOverrides: {
      business_name: 'Örn: Aura Medikal Estetik',
      ai_name: 'Örn: Aura, Asistan',
      appointment_duration: 'Örn: 30 (kontrol), 60 (işlem)',
      duration_hint: 'Botox (30 dk), Dolgu (45 dk), Lazer (60 dk)',
      employees: 'Örn: Dr. Ayşe (Dermatoloji), Dr. Mehmet (Estetik Cerrah)',
    },
    extraQuestions: [
      { id: 'treatments', label: 'Tedavi ve İşlemler', placeholder: 'Örn: Botox, dolgu, lazer, mezoterapi, PRP, cilt yenileme', type: 'textarea', required: true },
      { id: 'doctor_info', label: 'Doktor/Uzman Bilgisi', placeholder: 'Örn: Dr. Ahmet Yılmaz - Dermatoloji Uzmanı', type: 'text' },
    ]
  },
  {
    id: 'physiotherapy', label: 'Fizyoterapi & Rehabilitasyon', iconName: 'HeartPulse',
    placeholderOverrides: {
      business_name: 'Örn: Hareket Fizyoterapi Merkezi',
      ai_name: 'Örn: Asistan, Sağlık',
      appointment_duration: 'Örn: 45, 60',
      duration_hint: 'Manuel terapi (45 dk), Egzersiz programı (60 dk)',
      employees: 'Örn: Fzt. Ali (Manuel Terapi), Fzt. Zeynep (Elektroterapi)',
    },
    extraQuestions: [
      { id: 'treatments', label: 'Tedavi Yöntemleri', placeholder: 'Örn: Manuel terapi, elektroterapi, egzersiz, hidroterapi', type: 'textarea', required: true },
      { id: 'insurance_policy', label: 'Sigorta Politikası', placeholder: 'Örn: SGK anlaşmalı, özel sigorta kabul edilir', type: 'text' },
    ]
  },
  {
    id: 'auto_service', label: 'Oto Servis & Yedek Parça', iconName: 'Wrench',
    placeholderOverrides: {
      business_name: 'Örn: Master Oto Servis',
      ai_name: 'Örn: Usta, Asistan',
      working_hours: 'Örn: Pzt-Cmt 08:30-18:30',
      appointment_duration: 'Örn: 60 (bakım), 120 (onarım)',
      duration_hint: 'Yağ değişimi (30 dk), Periyodik bakım (60 dk), Motor onarımı (120 dk)',
      employees: 'Örn: Usta Ahmet (Motor), Usta Murat (Elektrik), Hasan (Lastik)',
    },
    extraQuestions: [
      { id: 'services', label: 'Servis Hizmetleri', placeholder: 'Örn: Bakım, onarım, lastik, oto yıkama, oto elektrik', type: 'textarea', required: true },
      { id: 'vehicle_types', label: 'Kabul Edilen Araç Tipleri', placeholder: 'Örn: Binek, SUV, hafif ticari', type: 'text' },
    ]
  },
  {
    id: 'ecommerce', label: 'E-ticaret & Butik Mağaza', iconName: 'ShoppingBag',
    placeholderOverrides: {
      business_name: 'Örn: Chic Boutique',
      ai_name: 'Örn: Stil, Butik, Asistan',
      working_hours: 'Örn: Online 7/24, Mağaza Pzt-Cmt 10:00-20:00',
      appointment_duration: 'Randevu gerektirmezse boş bırakın',
      employees: 'Örn: Müşteri hizmetleri ekibi',
    },
    extraQuestions: [
      { id: 'has_trendyol', label: 'Trendyol Mağazanız Var Mı?', placeholder: '', type: 'select', options: ['Evet', 'Hayır'], required: true },
      { id: 'trendyol_integrate', label: 'Trendyol Mağazanızı Entegre Edecek Misiniz?', placeholder: '', type: 'select', options: ['Evet', 'Hayır'] },
      { id: 'product_categories', label: 'Ürün Kategorileri', placeholder: 'Örn: Giyim, aksesuar, hediyeik, kozmetik', type: 'textarea', required: true },
      { id: 'shipping_policy', label: 'Kargo & İade Politikası', placeholder: 'Örn: 500 TL üzeri ücretsiz kargo, 14 gün iade', type: 'textarea' },
    ]
  },
  {
    id: 'dental', label: 'Diş Kliniği & Diş Hekimi', iconName: 'Stethoscope',
    placeholderOverrides: {
      business_name: 'Örn: Gülüş Diş Kliniği',
      ai_name: 'Örn: Dişçim, Asistan',
      appointment_duration: 'Örn: 30 (kontrol), 60 (tedavi), 90 (cerrahi)',
      duration_hint: 'Kontrol (30 dk), Dolgu (45 dk), Kanal tedavisi (60 dk), İmplant (90 dk)',
      employees: 'Örn: Dr. Zeynep (İmplant), Dr. Can (Ortodonti), Dr. Selin (Çocuk Diş)',
    },
    extraQuestions: [
      { id: 'treatments', label: 'Tedaviler', placeholder: 'Örn: Dolgu, kanal tedavisi, implant, ortodonti, diş protez', type: 'textarea', required: true },
      { id: 'emergency_policy', label: 'Acil Durum Politikası', placeholder: 'Örn: 7/24 acil diş hattı mevcut', type: 'text' },
    ]
  },
  {
    id: 'plastic_surgery', label: 'Estetik & Plastik Cerrahi', iconName: 'Heart',
    placeholderOverrides: {
      business_name: 'Örn: Aesthetic Center İstanbul',
      ai_name: 'Örn: Estetik, Asistan',
      appointment_duration: 'Örn: 30 (konsültasyon), 60 (kontrol)',
      duration_hint: 'Konsültasyon (30 dk), Kontrol (45 dk)',
      employees: 'Örn: Prof. Dr. Ali (Plastik Cerrahi), Op. Dr. Seda (Rinoplasti)',
    },
    extraQuestions: [
      { id: 'procedures', label: 'İşlemler', placeholder: 'Örn: Burun estetiği, yüz germe, liposuction, meme estetiği', type: 'textarea', required: true },
      { id: 'consultation_info', label: 'Konsültasyon Bilgisi', placeholder: 'Örn: İlk muayene ücretsiz, online konsültasyon mevcut', type: 'text' },
    ]
  },
  {
    id: 'photography', label: 'Fotoğrafçılık & Video', iconName: 'Camera',
    placeholderOverrides: {
      business_name: 'Örn: Frame Studio',
      ai_name: 'Örn: Frame, Lens, Asistan',
      working_hours: 'Örn: Pzt-Cum 10:00-19:00, hafta sonu çekim var',
      appointment_duration: 'Örn: 60 (portre), 120 (ürün), tüm gün (düğün)',
      duration_hint: 'Portre çekimi (60 dk), Ürün çekimi (120 dk), Düğün (tüm gün)',
      employees: 'Örn: Emre (Düğün Fotoğrafçısı), Deniz (Video), Sude (Ürün Çekimi)',
    },
    extraQuestions: [
      { id: 'services', label: 'Hizmetler', placeholder: 'Örn: Düğün fotoğrafı, ürün çekimi, tanıtım videosu, drone', type: 'textarea', required: true },
      { id: 'packages', label: 'Paketler', placeholder: 'Örn: Düğün paketi 15.000 TL, Ürün çekimi 200 TL/adet', type: 'textarea' },
    ]
  },
  {
    id: 'psychology', label: 'Psikoloji & Terapi', iconName: 'Brain',
    placeholderOverrides: {
      business_name: 'Örn: İç Dünya Psikoloji Merkezi',
      ai_name: 'Örn: Destek, Asistan',
      appointment_duration: 'Örn: 50 (bireysel), 60 (çift terapisi)',
      duration_hint: 'Bireysel seans (50 dk), Çift terapisi (60 dk), Çocuk seans (40 dk)',
      employees: 'Örn: Psk. Elif (Bireysel), Psk. Ahmet (Çift Terapisi), Psk. Sema (Çocuk)',
    },
    extraQuestions: [
      { id: 'specializations', label: 'Uzmanlık Alanları', placeholder: 'Örn: Bireysel terapi, çift terapisi, çocuk psikolojisi', type: 'textarea', required: true },
      { id: 'session_info', label: 'Seans Bilgisi', placeholder: 'Örn: 50 dakika, online seans mevcut', type: 'text' },
    ]
  },
  {
    id: 'restaurant', label: 'Restoran & Kafe', iconName: 'UtensilsCrossed',
    placeholderOverrides: {
      business_name: 'Örn: Lezzet Durağı Restoran',
      ai_name: 'Örn: Garson, Lezzet, Asistan',
      working_hours: 'Örn: Her gün 11:00-23:00',
      appointment_duration: 'Örn: Masa rezervasyonu için süre belirtilmez',
      duration_hint: 'Kahvaltı (90 dk), Öğle yemeği (60 dk), Akşam yemeği (120 dk)',
      employees: 'Örn: Şef Ahmet (Mutfak), Barista Selin (Kafe)',
    },
    extraQuestions: [
      { id: 'cuisine', label: 'Mutfak & Menü Bilgisi', placeholder: 'Örn: Türk mutfağı, İtalyan, kahvaltı, vegan seçenekler', type: 'textarea', required: true },
      { id: 'reservation_policy', label: 'Rezervasyon Politikası', placeholder: 'Örn: Online rezervasyon, minimum 2 kişi, kapora gerekli', type: 'textarea' },
    ]
  },
  {
    id: 'auto_gallery', label: 'Oto Galeri', iconName: 'Gauge',
    placeholderOverrides: {
      business_name: 'Örn: Premium Oto Galeri',
      ai_name: 'Örn: Oto, Asistan',
      appointment_duration: 'Örn: 30 (test sürüşü), 45 (ekspertiz)',
      duration_hint: 'Test sürüşü (30 dk), Ekspertiz (45 dk)',
      employees: 'Örn: Ali (Satış Danışmanı), Murat (Ekspertiz Uzmanı)',
    },
    extraQuestions: [
      { id: 'services', label: 'Hizmetler', placeholder: 'Örn: 2. el satış, takas, ekspertiz, sigorta, kredi', type: 'textarea', required: true },
      { id: 'vehicle_brands', label: 'Araç Markaları / Segmentler', placeholder: 'Örn: BMW, Mercedes, Audi, Toyota — Binek, SUV, Ticari', type: 'textarea' },
      { id: 'payment_options', label: 'Ödeme Seçenekleri', placeholder: 'Örn: Nakit, kredi, takas, senet', type: 'text' },
    ]
  },
  {
    id: 'car_rental', label: 'Araç Kiralama', iconName: 'Car',
    placeholderOverrides: {
      business_name: 'Örn: GoRent Araç Kiralama',
      ai_name: 'Örn: Rent, Asistan',
      working_hours: 'Örn: Her gün 08:00-20:00',
      appointment_duration: 'Örn: Günlük, Haftalık, Aylık kiralama',
      duration_hint: 'Günlük kiralama (24 saat), Haftalık (7 gün)',
      employees: 'Kayıtlı araçlarınız otomatik yüklenecek',
    },
    extraQuestions: [
      { id: 'rental_policy', label: 'Kiralama Şartları', placeholder: 'Örn: Ehliyet 2 yıl, min yaş 21, depozito 5000 TL', type: 'textarea', required: true },
      { id: 'pricing_model', label: 'Fiyatlandırma', placeholder: 'Örn: Otomobil günlük 800 TL, SUV günlük 1500 TL, haftalık %20 indirim', type: 'textarea' },
      { id: 'delivery_options', label: 'Teslimat Seçenekleri', placeholder: 'Örn: Havalimanı teslim, adrese teslimat, şubeden teslim', type: 'text' },
      { id: 'insurance_info', label: 'Sigorta Bilgisi', placeholder: 'Örn: Tam kasko dahil, mini hasar muafiyeti 3000 TL', type: 'text' },
    ]
  },
  {
    id: 'wedding', label: 'Düğün & Organizasyon', iconName: 'PartyPopper',
    placeholderOverrides: {
      business_name: 'Örn: Dream Wedding Organizasyon',
      ai_name: 'Örn: Dream, Düğün, Asistan',
      appointment_duration: 'Örn: 60 (keşif görüşmesi)',
      duration_hint: 'Keşif görüşmesi (60 dk), Mekan gezisi (90 dk)',
      employees: 'Örn: Ayşe (Koordinatör), Fatma (Dekorasyon), Kemal (DJ)',
    },
    extraQuestions: [
      { id: 'services', label: 'Hizmetler', placeholder: 'Örn: Düğün organizasyonu, nişan, kına, parti, kurumsal etkinlik', type: 'textarea', required: true },
      { id: 'capacity', label: 'Kapasite & Mekan Bilgisi', placeholder: 'Örn: 50-500 kişilik salonlar, açık hava seçeneği', type: 'textarea' },
    ]
  },
  {
    id: 'dietitian', label: 'Diyetisyen & Beslenme', iconName: 'Apple',
    placeholderOverrides: {
      business_name: 'Örn: Sağlıklı Yaşam Diyetisyenlik',
      ai_name: 'Örn: Diyetim, Asistan',
      appointment_duration: 'Örn: 60 (ilk görüşme), 30 (kontrol)',
      duration_hint: 'İlk görüşme (60 dk), Kontrol (30 dk), Ölçüm (15 dk)',
      employees: 'Örn: Dyt. Selen (Kilo Yönetimi), Dyt. Burak (Sporcu Beslenmesi)',
    },
    extraQuestions: [
      { id: 'services', label: 'Hizmetler', placeholder: 'Örn: Kilo verme, sporcu beslenmesi, hamilelik diyeti', type: 'textarea', required: true },
      { id: 'session_format', label: 'Görüşme Formatı', placeholder: 'Örn: Yüz yüze ve online, ilk görüşme 60 dk, kontrol 30 dk', type: 'text' },
    ]
  },
  {
    id: 'accounting', label: 'Muhasebe & Mali Müşavirlik', iconName: 'Calculator',
    placeholderOverrides: {
      business_name: 'Örn: Güven Mali Müşavirlik',
      ai_name: 'Örn: Mali, Asistan',
      appointment_duration: 'Örn: 30 (danışmanlık)',
      duration_hint: 'Vergi danışmanlık (30 dk), Şirket kuruluş görüşmesi (60 dk)',
      employees: 'Örn: SMMM Ali Bey, Muhasebeci Ayşe Hanım',
    },
    extraQuestions: [
      { id: 'services', label: 'Hizmetler', placeholder: 'Örn: Defter tutma, vergi danışmanlığı, şirket kuruluş, SGK işlemleri', type: 'textarea', required: true },
      { id: 'client_types', label: 'Müşteri Tipleri', placeholder: 'Örn: Şahıs firmaları, limited, anonim şirketler', type: 'text' },
    ]
  },
  {
    id: 'real_estate', label: 'Emlak Ofisi', iconName: 'Home',
    placeholderOverrides: {
      business_name: 'Örn: Prestij Emlak',
      ai_name: 'Örn: Emlak, Asistan',
      appointment_duration: 'Örn: 30 (görüşme), 60 (gezi)',
      duration_hint: 'Ofis görüşmesi (30 dk), Emlak gezisi (60 dk)',
      employees: 'Örn: Mehmet (Satılık), Zeynep (Kiralık), Hakan (Ticari)',
    },
    extraQuestions: [
      { id: 'services', label: 'Hizmetler', placeholder: 'Örn: Satılık, kiralık, gayrimenkul danışmanlığı', type: 'textarea', required: true },
      { id: 'regions', label: 'Hizmet Bölgeleri', placeholder: 'Örn: İstanbul Avrupa yakası, Beşiktaş, Şişli, Kadıköy', type: 'text' },
    ]
  },
  {
    id: 'education', label: 'Eğitim & Kurs Merkezi', iconName: 'GraduationCap',
    placeholderOverrides: {
      business_name: 'Örn: Bilgi Akademi',
      ai_name: 'Örn: Akademi, Asistan',
      appointment_duration: 'Örn: 40 (ders), 60 (özel ders)',
      duration_hint: 'Grup dersi (40 dk), Özel ders (60 dk), Deneme dersi (30 dk)',
      employees: 'Örn: Öğr. Ahmet (İngilizce), Öğr. Selin (Matematik), Öğr. Can (Müzik)',
    },
    extraQuestions: [
      { id: 'courses', label: 'Kurslar / Eğitimler', placeholder: 'Örn: İngilizce, müzik, dans, yazılım, özel ders', type: 'textarea', required: true },
      { id: 'age_groups', label: 'Yaş Grupları', placeholder: 'Örn: Çocuk (5-12), Genç (13-18), Yetişkin', type: 'text' },
    ]
  },
  {
    id: 'fitness', label: 'Spor & Fitness', iconName: 'Dumbbell',
    placeholderOverrides: {
      business_name: 'Örn: Power Gym Fitness',
      ai_name: 'Örn: Coach, Asistan',
      working_hours: 'Örn: Pzt-Cum 06:00-23:00, Cmt-Paz 08:00-20:00',
      appointment_duration: 'Örn: 60 (PT), 45 (grup dersi)',
      duration_hint: 'PT seansı (60 dk), Pilates (45 dk), Yoga (60 dk)',
      employees: 'Örn: PT Murat (Fitness), Eğitmen Seda (Pilates), Eğitmen Deniz (Yoga)',
    },
    extraQuestions: [
      { id: 'services', label: 'Hizmetler', placeholder: 'Örn: Fitness, pilates, yoga, yüzme, CrossFit, PT', type: 'textarea', required: true },
      { id: 'membership_info', label: 'Üyelik Bilgisi', placeholder: 'Örn: Aylık 1500 TL, yıllık 12000 TL, PT ek ücret', type: 'textarea' },
    ]
  },
  {
    id: 'veterinary', label: 'Veteriner & Pet', iconName: 'PawPrint',
    placeholderOverrides: {
      business_name: 'Örn: Can Dostum Veteriner Kliniği',
      ai_name: 'Örn: Patici, Asistan',
      appointment_duration: 'Örn: 20 (kontrol), 30 (aşı), 60+ (ameliyat)',
      duration_hint: 'Kontrol (20 dk), Aşı (30 dk), Diş temizliği (45 dk)',
      employees: 'Örn: Vet. Dr. Ali (Cerrahi), Vet. Dr. Sena (İç Hastalıkları)',
    },
    extraQuestions: [
      { id: 'services', label: 'Hizmetler', placeholder: 'Örn: Muayene, aşı, ameliyat, diş temizliği, tıraş', type: 'textarea', required: true },
      { id: 'pet_types', label: 'Kabul Edilen Hayvanlar', placeholder: 'Örn: Kedi, köpek, kuş, egzotik hayvanlar', type: 'text' },
    ]
  },
  {
    id: 'law', label: 'Hukuk & Avukatlık', iconName: 'Scale',
    placeholderOverrides: {
      business_name: 'Örn: Adalet Hukuk Bürosu',
      ai_name: 'Örn: Hukuk, Asistan',
      appointment_duration: 'Örn: 30 (ön görüşme), 60 (detaylı danışmanlık)',
      duration_hint: 'Ön görüşme (30 dk), Detaylı danışmanlık (60 dk)',
      employees: 'Örn: Av. Mehmet (İş Hukuku), Av. Elif (Aile Hukuku), Av. Burak (Ceza)',
    },
    extraQuestions: [
      { id: 'practice_areas', label: 'Uzmanlık Alanları', placeholder: 'Örn: İş hukuku, aile hukuku, ceza hukuku, ticaret hukuku', type: 'textarea', required: true },
      { id: 'consultation_fee', label: 'Danışmanlık Ücreti', placeholder: 'Örn: İlk görüşme ücretsiz, saat başı 2000 TL', type: 'text' },
    ]
  },
  {
    id: 'cleaning', label: 'Temizlik & Ev Hizmetleri', iconName: 'SprayCan',
    placeholderOverrides: {
      business_name: 'Örn: Pirıl Temizlik Hizmetleri',
      ai_name: 'Örn: Pirıl, Asistan',
      appointment_duration: 'Örn: 120 (standart), 240 (derin temizlik)',
      duration_hint: 'Standart temizlik (120 dk), Derin temizlik (240 dk), Halı yıkama (60 dk)',
      employees: 'Örn: Ekip 1 (Ev), Ekip 2 (Ofis), Ekip 3 (Halı Yıkama)',
    },
    extraQuestions: [
      { id: 'services', label: 'Hizmetler', placeholder: 'Örn: Ev temizliği, ofis temizliği, tadilat sonrası, halı yıkama', type: 'textarea', required: true },
      { id: 'pricing_model', label: 'Fiyatlandırma Modeli', placeholder: 'Örn: Saatlik 250 TL, günlük 1500 TL', type: 'text' },
    ]
  },
  {
    id: 'printing', label: 'Matbaa & Reklam', iconName: 'Printer',
    placeholderOverrides: {
      business_name: 'Örn: Baskı Merkezi Matbaa',
      ai_name: 'Örn: Baskı, Asistan',
      appointment_duration: 'Randevu gerektirmezse boş bırakın',
      employees: 'Örn: Grafiker Emre, Baskı Operatörü Kemal',
    },
    extraQuestions: [
      { id: 'services', label: 'Hizmetler', placeholder: 'Örn: Kartvizit, broşür, tabela, dijital baskı', type: 'textarea', required: true },
      { id: 'min_order', label: 'Minimum Sipariş', placeholder: 'Örn: Min 100 adet kartvizit, 50 adet broşür', type: 'text' },
    ]
  },
  {
    id: 'optics', label: 'Optik & Gözlükçü', iconName: 'Eye',
    placeholderOverrides: {
      business_name: 'Örn: Net Görüş Optik',
      ai_name: 'Örn: Optik, Asistan',
      appointment_duration: 'Örn: 20 (muayene), 30 (lens uygulaması)',
      duration_hint: 'Göz muayenesi (20 dk), Lens uygulaması (30 dk)',
      employees: 'Örn: Optisyen Elif, Dr. Kemal (Göz Muayenesi)',
    },
    extraQuestions: [
      { id: 'services', label: 'Hizmetler', placeholder: 'Örn: Göz muayenesi, numaralı gözlük, lens, güneş gözlüğü', type: 'textarea', required: true },
      { id: 'brands', label: 'Markalar', placeholder: 'Örn: Ray-Ban, Oakley, Essilor lensler', type: 'text' },
    ]
  },
  {
    id: 'florist', label: 'Çiçekçi & Peyzaj', iconName: 'Flower2',
    placeholderOverrides: {
      business_name: 'Örn: Çiçek Bahçem',
      ai_name: 'Örn: Çiçek, Asistan',
      working_hours: 'Örn: Her gün 08:00-20:00',
      appointment_duration: 'Randevu gerektirmezse boş bırakın',
      employees: 'Örn: Aranjman ekibi, Teslimat ekibi',
    },
    extraQuestions: [
      { id: 'services', label: 'Hizmetler', placeholder: 'Örn: Buket, aranjman, çelenk, düğün çiçeği, peyzaj', type: 'textarea', required: true },
      { id: 'delivery_info', label: 'Teslimat Bilgisi', placeholder: 'Örn: Aynı gün teslimat, şehir içi ücretsiz', type: 'text' },
    ]
  },
  {
    id: 'architecture', label: 'Mimarlık & İç Mimarlık', iconName: 'Ruler',
    placeholderOverrides: {
      business_name: 'Örn: Tasarım Evi Mimarlık',
      ai_name: 'Örn: Tasarım, Asistan',
      appointment_duration: 'Örn: 60 (keşif görüşmesi)',
      employees: 'Örn: Mimar Selin, İç Mimar Deniz, 3D Tasarımcı Emre',
    },
    extraQuestions: [
      { id: 'services', label: 'Hizmetler', placeholder: 'Örn: İç mimarlık, dekorasyon, proje çizimi, 3D tasarım', type: 'textarea', required: true },
      { id: 'project_types', label: 'Proje Türleri', placeholder: 'Örn: Konut, ofis, restoran, otel renovasyonu', type: 'text' },
    ]
  },
  {
    id: 'pharmacy', label: 'Eczane', iconName: 'Pill',
    placeholderOverrides: {
      business_name: 'Örn: Şifa Eczanesi',
      ai_name: 'Örn: Eczacım, Asistan',
      working_hours: 'Örn: Pzt-Cmt 08:30-19:30',
      appointment_duration: 'Randevu gerektirmezse boş bırakın',
      employees: 'Örn: Ecz. Ayşe, Ecz. Mehmet',
    },
    extraQuestions: [
      { id: 'services', label: 'Ek Hizmetler', placeholder: 'Örn: Tansiyon ölçümü, şeker ölçümü, dermokozmetik danışmanlık', type: 'textarea' },
      { id: 'nöbet_info', label: 'Nöbet Bilgisi', placeholder: 'Örn: Nöbet günleri web sitesinde yayınlanır', type: 'text' },
    ]
  },
  {
    id: 'villa_rental', label: 'Villa / Apart Kiralama', iconName: 'Home',
    placeholderOverrides: {
      business_name: 'Örn: Çeşme Tatil Villaları, Kaş Apart Evleri',
      ai_name: 'Örn: Tatil, Konak, Villa Asistan',
      working_hours: 'Örn: Her gün 09:00-21:00, 7/24 WhatsApp',
      appointment_duration: 'Örn: Gecelik, Haftalık konaklama',
      duration_hint: 'Minimum 2 gece, haftalık kiralama (7 gece)',
      employees: 'Kayıtlı villa ve apartlarınız otomatik yüklenecek',
    },
    extraQuestions: [
      { id: 'property_types', label: 'Mülk Tipleri', placeholder: 'Örn: Müstakil villa, apart daire, bungalov, dağ evi, taş ev, tiny house', type: 'textarea', required: true },
      { id: 'stay_policy', label: 'Konaklama Koşulları', placeholder: 'Örn: Check-in 15:00, Check-out 11:00, minimum 2 gece, depozito 3000 TL, temizlik ücreti 500 TL', type: 'textarea', required: true },
      { id: 'amenities', label: 'Olanaklar & Özellikler', placeholder: 'Örn: Özel havuz, bahçe, mangal, WiFi, klima, şömine, jakuzi, otopark, denize yakınlık', type: 'textarea' },
      { id: 'nearby_attractions', label: 'Çevre & Konum Bilgisi', placeholder: 'Örn: Denize 200m, markete 5 dk yürüme, Çeşme merkeze 10 dk, havaalalına 45 dk', type: 'textarea' },
      { id: 'pricing_model', label: 'Fiyatlandırma', placeholder: 'Örn: Villa gecelik 3000-8000 TL, apart gecelik 1000-2500 TL, haftalık %15 indirim, sezon farklılıkları', type: 'textarea' },
      { id: 'cancellation_policy', label: 'İptal Politikası', placeholder: 'Örn: 14 gün öncesine kadar ücretsiz iptal, 7 gün öncesi %50 iade, son 3 gün iade yok', type: 'textarea' },
    ]
  },
  {
    id: 'boat_rental', label: 'Tekne & Yat Kiralama', iconName: 'Ship',
    placeholderOverrides: {
      business_name: 'Örn: Blue Voyage Yat Kiralama',
      ai_name: 'Örn: Kaptan, Asistan',
      working_hours: 'Örn: Her gün 08:00-20:00 (Sezon: Mayıs-Ekim)',
      appointment_duration: 'Örn: Günlük, Haftalık kiralama',
      duration_hint: 'Günlük tur (8 saat), Haftalık kiralama (7 gün)',
      employees: 'Kayıtlı tekneleriniz otomatik yüklenecek',
    },
    extraQuestions: [
      { id: 'routes', label: 'Popüler Rotalar', placeholder: 'Örn: 12 Ada, Göcek Koyu, Bodrum-Datça', type: 'textarea', required: true },
      { id: 'rental_policy', label: 'Kiralama Koşulları', placeholder: 'Örn: Ehliyet gerekli, sigorta, depozito, yaş sınırı', type: 'textarea' },
      { id: 'season_info', label: 'Sezon Bilgisi', placeholder: 'Örn: Mayıs-Ekim arası aktif, kış bakımda', type: 'text' },
    ]
  },
  {
    id: 'studio_rental', label: 'Stüdyo Kiralama', iconName: 'Mic',
    placeholderOverrides: {
      business_name: 'Örn: SoundWave Studios, Lens Fotoğraf Stüdyosu',
      ai_name: 'Örn: Studio, Asistan',
      working_hours: 'Örn: Pzt-Cmt 09:00-22:00, Pazar 10:00-18:00',
      appointment_duration: 'Örn: Saatlik (1-8 saat), Günlük',
      duration_hint: 'Kayıt seansı (2-4 saat), Fotoğraf çekimi (1-3 saat), Video prodüksiyon (4-8 saat)',
      employees: 'Kayıtlı stüdyolarınız otomatik yüklenecek',
    },
    extraQuestions: [
      { id: 'studio_types', label: 'Stüdyo Tipleri', placeholder: 'Örn: Müzik kayıt stüdyosu, fotoğraf stüdyosu, video prodüksiyon, film seti, podcast stüdyosu', type: 'textarea', required: true },
      { id: 'equipment_services', label: 'Sağlanan Ekipman & Hizmetler', placeholder: 'Örn: Profesyonel mikrofon, mikser, ışık sistemi, green screen, kamera, ses mühendisi desteği, mix-mastering', type: 'textarea', required: true },
      { id: 'booking_policy', label: 'Rezervasyon Koşulları', placeholder: 'Örn: Minimum 2 saat, iptal 24 saat öncesine kadar ücretsiz, %50 kapora, ekipman hasarı müşteriye aittir', type: 'textarea', required: true },
      { id: 'pricing_model', label: 'Fiyatlandırma', placeholder: 'Örn: Müzik stüdyosu 500 TL/saat, fotoğraf stüdyosu 300 TL/saat, günlük paket %20 indirimli, ses mühendisi +200 TL/saat', type: 'textarea' },
      { id: 'additional_services', label: 'Ek Hizmetler', placeholder: 'Örn: Ses mühendisi, ışıkçı, makyöz, catering, mix-mastering, renk düzeltme, video kurgu', type: 'textarea' },
    ]
  },
  {
    id: 'other', label: 'Diğer Sektör', iconName: 'Building',
    placeholderOverrides: {
      business_name: 'Örn: Firma adınız',
      ai_name: 'Örn: Asistan',
    },
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

## Kaynak Fotoğraf Paylaşım Kuralları
- Müşteriye bir kaynak (oda, villa, tekne, araç vb.) önerdiğinde ve o kaynağın kapak fotoğrafı (cover_photo) varsa, görseli paylaş.
- Fotoğraf göndermek için mesajına [SEND_PHOTO:kaynak_adı] formatını ekle. Örnek: [SEND_PHOTO:Sunset Villa]
- Her kaynak önerisinde kapak fotoğrafını gönder. Müşteri detay isterse veya daha fazla fotoğraf görmek isterse detay URL'sini paylaş.
- Eğer kaynağın detay URL'si (detail_url) varsa, mesajına "📸 Tüm fotoğraflar ve detaylar için: [URL]" satırını ekle.
- Asla fotoğraf URL'sini doğrudan text mesaj olarak gönderme. Her zaman [SEND_PHOTO:kaynak_adı] formatını kullan.
- Fotoğrafı yalnızca kaynak hakkında bilgi verirken gönder. Genel sohbette fotoğraf gönderme.
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

  // Trendyol entegrasyonu bilgisi
  const hasTrendyol = answers.has_trendyol === 'Evet' && answers.trendyol_integrate === 'Evet';
  const trendyolBlock = hasTrendyol ? `
10. İşletme Trendyol marketplace entegrasyonu kullanacaktır. Sistem mesajına aşağıdaki TRENDYOL bölümünü de ekle:

### TRENDYOL MAĞAZA YÖNETİMİ
Sen aynı zamanda işletmenin Trendyol mağazasının AI asistanısın.

**Ürün Önerisi ve Satış:**
- Müşteri bir ürün sorduğunda, aradığında veya almak istediğinde 'search_trendyol_products' aracını kullan.
- Bulunan ürünleri fiyat, stok ve özellikleriyle birlikte listele.
- Her ürünün Trendyol satış linkini MUTLAKA paylaş.
- İndirimli ürünlerde eski fiyatı üstü çizili, yeni fiyatı vurgulu göster.
- Stokta olmayan ürünleri önerme.
- Müşterinin bütçesine ve ihtiyaçlarına göre en uygun ürünleri seç.
- En fazla 3-4 ürün öner, çok uzun listeler yapma.

**Sipariş Sorgulama:**
- Müşteri sipariş durumu sorduğunda 'check_trendyol_order' aracını kullan.
- Sipariş numarası ile sorgulama yap.
- Kargo takip numarası ve tahmini teslim tarihini paylaş.

**İade İşlemleri:**
- Müşteri iade talebinde bulunduğunda 'create_trendyol_return' aracını kullan.
- İade sebebini mutlaka sor.
- İade kodunu ve kargo bilgilerini müşteriye ilet.

### ARAÇ KULLANIM TALİMATLARI (TRENDYOL)
1. search_trendyol_products — Ürün arama, filtreleme ve müşteriye önerme
2. check_trendyol_order — Sipariş durumu sorgulama
3. create_trendyol_return — İade talebi oluşturma
` : '';

  // Kayıtlı kaynaklar bloğu
  const registeredResources = answers.registered_resources || '';
  const resourceBlock = registeredResources ? `

## KAYITLI KAYNAKLAR:
Bu işletmenin sistemde kayıtlı kaynakları aşağıdadır. AI asistan müşteriye bu kaynakları önerirken detaylı bilgi vermeli ve check_availability tool'u ile müsaitlik kontrolü yapmalıdır.
${registeredResources}
` : '';

  return `Sen bir AI asistan sistem mesajı oluşturma uzmanısın. Aşağıdaki bilgilere göre bir işletmenin WhatsApp ve Instagram üzerinden müşterilerle iletişim kuracak AI asistanı için kapsamlı ve profesyonel bir sistem mesajı oluştur.

## SEKTÖR: ${sectorLabel}

## İŞLETME BİLGİLERİ:
${answerLines}
${resourceBlock}
## TALİMATLAR:
1. Sistem mesajını Türkçe yaz.
2. Mesaj, AI asistanın kimlik tanımıyla başlasın (adı, hangi firmada çalıştığı, ne yaptığı).
3. Firmanın hizmetlerini, çalışma saatlerini ve iletişim bilgilerini net olarak belirt.
4. İletişim tonunu kullanıcının belirttiği tarza göre ayarla.
5. Sektöre özel bilgileri (hizmet listesi, fiyatlar, politikalar) detaylı şekilde dahil et.
6. Personel veya kaynak listesi verildiyse hangi kaynağın hangi hizmeti verdiğini veya özelliklerini detaylı belirt.
7. Eğer KAYITLI KAYNAKLAR bölümü varsa, bu kaynakları (odalar, tekneler, masalar, araçlar vb.) sistem mesajında detaylı olarak listele ve AI asistanın müşteriye doğru bilgi vermesini sağla. Her kaynağın ismi, özellikleri ve ek bilgilerini sistem mesajına dahil et.
8. Mesajın sonuna aşağıdaki SABİT TOOL KURALLARINI ekle — bu kuralları DEĞİŞTİRME, aynen ekle:

---
${FIXED_TOOL_RULES}
---

9. Sadece sistem mesajını üret, başka bir açıklama veya yorum ekleme.
10. Mesaj en az 800, en fazla 2000 kelime olsun.
${trendyolBlock}`;
}
