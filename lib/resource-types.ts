/**
 * Kaynak Tipi Tanımlamaları
 * Her kaynak tipi için form alanları, etiketler ve placeholder'lar
 */

export type ResourceType = "employee" | "room" | "boat" | "vehicle" | "table" | "villa" | "studio" | "tour";

export interface AttributeField {
    key: string;
    label: string;
    type: "text" | "number" | "select" | "multi-select" | "checkbox";
    placeholder?: string;
    options?: string[];
    suffix?: string; // "kişi", "metre" gibi birim
}

export interface ResourceTypeConfig {
    id: ResourceType;
    label: string;
    iconName: string;
    namePlaceholder: string;
    nameLabel: string;
    titleLabel?: string;
    titlePlaceholder?: string;
    attributeFields: AttributeField[];
    extraInfoPlaceholder: string;
    /** Tablo sütun başlıkları */
    tableColumns: { key: string; label: string }[];
    /** Toplu ekleme placeholder */
    batchPlaceholder: string;
    /** Excel sütun eşleştirme seçenekleri */
    excelMappableFields: { key: string; label: string }[];
    /** Fotoğraf yükleme etkin mi? */
    photosEnabled: boolean;
    /** Fotoğraf yükleme alanı altındaki bilgilendirme metni */
    photoHint: string;
    /** Detay URL alanı altındaki bilgilendirme metni */
    detailUrlHint: string;
}

export const RESOURCE_TYPES: ResourceTypeConfig[] = [
    {
        id: "employee",
        label: "Personel",
        iconName: "User",
        namePlaceholder: "Örn: Ahmet Yılmaz",
        nameLabel: "Ad Soyad",
        titleLabel: "Ünvan / Görev",
        titlePlaceholder: "Örn: Kuaför, Güzellik Uzmanı, Danışman",
        attributeFields: [],
        extraInfoPlaceholder: "Örn: 10 yıl deneyimli, İngilizce biliyor, uzman alanları...",
        tableColumns: [
            { key: "name", label: "Ad Soyad" },
            { key: "title", label: "Ünvan" },
        ],
        batchPlaceholder: "Ahmet Yılmaz\nAyşe Demir\nMehmet Kaya",
        excelMappableFields: [
            { key: "name", label: "Ad Soyad" },
            { key: "title", label: "Ünvan" },
            { key: "extra_info", label: "Ek Bilgiler" },
        ],
        photosEnabled: false,
        photoHint: "",
        detailUrlHint: "",
    },
    {
        id: "room",
        label: "Oda",
        iconName: "DoorOpen",
        namePlaceholder: "Örn: 201, Deluxe Suite, Kral Dairesi",
        nameLabel: "Oda Adı / Numarası",
        titleLabel: "Oda Tipi",
        titlePlaceholder: "Örn: Standart, Deluxe, Suite, Aile Odası",
        attributeFields: [
            { key: "capacity", label: "Kapasite", type: "number", placeholder: "2", suffix: "kişi" },
            { key: "bed_type", label: "Yatak Tipi", type: "multi-select", options: ["Tek Kişilik", "Çift Kişilik", "King Size", "Twin (İki Tek)", "Ranza"] },
            { key: "bathroom", label: "Banyo", type: "checkbox" },
            { key: "view", label: "Manzara", type: "select", options: ["Deniz", "Kara", "Bahçe", "Şehir", "Havuz", "Dağ"] },
            { key: "floor", label: "Kat", type: "number", placeholder: "2" },
            { key: "size_m2", label: "Oda Büyüklüğü", type: "number", placeholder: "28", suffix: "m²" },
        ],
        extraInfoPlaceholder: "Örn: Mini bar dahil, jakuzi mevcut, yeni renovasyon, balkon var...",
        tableColumns: [
            { key: "name", label: "Oda" },
            { key: "title", label: "Tip" },
            { key: "capacity", label: "Kapasite" },
            { key: "view", label: "Manzara" },
        ],
        batchPlaceholder: "201\n202\n203\n301\n302",
        excelMappableFields: [
            { key: "name", label: "Oda Adı / Numarası" },
            { key: "title", label: "Oda Tipi" },
            { key: "capacity", label: "Kapasite" },
            { key: "bed_type", label: "Yatak Tipi" },
            { key: "bathroom", label: "Banyo" },
            { key: "view", label: "Manzara" },
            { key: "floor", label: "Kat" },
            { key: "size_m2", label: "m²" },
            { key: "extra_info", label: "Ek Bilgiler" },
        ],
        photosEnabled: true,
        photoHint: "Odanın kapak fotoğrafını yükleyin. AI asistan müşteriye oda önerirken bu görseli gönderecektir.",
        detailUrlHint: "Otelinizin web sitesinde bu odanın detay sayfası varsa URL'sini ekleyin. AI asistan müşteriye 'Tüm fotoğraflar ve detaylar için' bu linki paylaşacaktır.",
    },
    {
        id: "boat",
        label: "Tekne Kiralama",
        iconName: "Ship",
        namePlaceholder: "Örn: Blue Dream, Sea Star, Rüzgar",
        nameLabel: "Tekne Adı",
        titleLabel: "Tekne Tipi",
        titlePlaceholder: "Örn: Gulet, Motor Yat, Yelkenli, Katamaran",
        attributeFields: [
            { key: "capacity", label: "Kapasite", type: "number", placeholder: "8", suffix: "kişi" },
            { key: "length_m", label: "Uzunluk", type: "number", placeholder: "12", suffix: "metre" },
            { key: "type", label: "Tekne Tipi", type: "select", options: ["Yelkenli", "Motor Yat", "Gulet", "Katamaran", "Sürat Teknesi", "Balıkçı Teknesi", "Tirhandil"] },
            { key: "year", label: "Yapım Yılı", type: "number", placeholder: "2020" },
            { key: "engine", label: "Motor Gücü", type: "text", placeholder: "200 HP" },
            { key: "crew", label: "Mürettebat Dahil", type: "checkbox" },
        ],
        extraInfoPlaceholder: "Örn: Tam donanımlı mutfak, 2 kabin, WiFi, ses sistemi, dalış ekipmanı...",
        tableColumns: [
            { key: "name", label: "Tekne Adı" },
            { key: "title", label: "Tip" },
            { key: "capacity", label: "Kapasite" },
            { key: "length_m", label: "Uzunluk" },
        ],
        batchPlaceholder: "Blue Dream\nSea Star\nWind Rider",
        excelMappableFields: [
            { key: "name", label: "Tekne Adı" },
            { key: "title", label: "Tekne Tipi" },
            { key: "capacity", label: "Kapasite" },
            { key: "length_m", label: "Uzunluk (m)" },
            { key: "type", label: "Tip" },
            { key: "year", label: "Yapım Yılı" },
            { key: "engine", label: "Motor Gücü" },
            { key: "crew", label: "Mürettebat" },
            { key: "extra_info", label: "Ek Bilgiler" },
        ],
        photosEnabled: true,
        photoHint: "Teknenin kapak fotoğrafını yükleyin. AI asistan müşteriye tekne önerirken bu görseli gönderecektir.",
        detailUrlHint: "Web sitenizde bu teknenin detay veya galeri sayfası varsa URL'sini ekleyin. AI asistan müşteriye 'Daha fazla fotoğraf ve detaylar için' bu linki paylaşacaktır.",
    },
    {
        id: "vehicle",
        label: "Araç Kiralama",
        iconName: "Car",
        namePlaceholder: "Örn: 34 ABC 123, BMW X5 Beyaz",
        nameLabel: "Araç Adı / Plaka",
        titleLabel: "Kategori",
        titlePlaceholder: "Örn: Otomobil, SUV, Motorsiklet",
        attributeFields: [
            { key: "category", label: "Araç Kategorisi", type: "select", options: ["Otomobil", "SUV", "Minibüs", "Motorsiklet", "ATV", "Jet-Ski", "Bisiklet", "Scooter", "Karavan", "Pick-up"] },
            { key: "brand", label: "Marka", type: "text", placeholder: "Örn: BMW, Toyota, Honda" },
            { key: "model", label: "Model", type: "text", placeholder: "Örn: X5, Corolla, CBR" },
            { key: "year", label: "Model Yılı", type: "number", placeholder: "2023" },
            { key: "fuel", label: "Yakıt", type: "select", options: ["Benzin", "Dizel", "Elektrik", "Hibrit", "LPG", "Yok"] },
            { key: "transmission", label: "Vites", type: "select", options: ["Otomatik", "Manuel", "Yok"] },
        ],
        extraInfoPlaceholder: "Örn: GPS dahil, bebek koltuğu mevcut, sigara içilmemiş, tam kasko...",
        tableColumns: [
            { key: "name", label: "Araç" },
            { key: "title", label: "Kategori" },
            { key: "brand_model", label: "Marka / Model" },
            { key: "year", label: "Yıl" },
        ],
        batchPlaceholder: "34 ABC 01\n34 ABC 02\n34 ABC 03",
        excelMappableFields: [
            { key: "name", label: "Araç Adı / Plaka" },
            { key: "title", label: "Kategori" },
            { key: "category", label: "Araç Kategorisi" },
            { key: "brand", label: "Marka" },
            { key: "model", label: "Model" },
            { key: "year", label: "Yıl" },
            { key: "fuel", label: "Yakıt" },
            { key: "transmission", label: "Vites" },
            { key: "extra_info", label: "Ek Bilgiler" },
        ],
        photosEnabled: true,
        photoHint: "Aracın kapak fotoğrafını yükleyin. AI asistan müşteriye araç önerirken bu görseli gönderecektir.",
        detailUrlHint: "Web sitenizde bu aracın detay sayfası varsa URL'sini ekleyin. AI asistan müşteriye 'Araç detayları için' bu linki paylaşacaktır.",
    },
    {
        id: "table",
        label: "Masa",
        iconName: "UtensilsCrossed",
        namePlaceholder: "Örn: Masa 1, VIP Masa, Bahçe 3, Bar Tezgahı",
        nameLabel: "Masa Adı / Numarası",
        titleLabel: "Masa Tipi",
        titlePlaceholder: "Örn: Normal, VIP, Loca, Bar",
        attributeFields: [
            { key: "capacity", label: "Kapasite", type: "number", placeholder: "4", suffix: "kişi" },
            { key: "area", label: "Alan", type: "select", options: ["İç Mekan", "Bahçe", "Teras", "Balkon", "Çatı Katı", "Bar Alanı", "VIP Bölüm", "Loca"] },
            { key: "smoking", label: "Sigara İçilebilir", type: "checkbox" },
            { key: "reservable", label: "Rezerve Edilebilir", type: "checkbox" },
            { key: "window_seat", label: "Cam Kenarı / Manzaralı", type: "checkbox" },
            { key: "power_outlet", label: "Priz Mevcut", type: "checkbox" },
            { key: "quiet_zone", label: "Sessiz Bölge", type: "checkbox" },
            { key: "shape", label: "Masa Şekli", type: "select", options: ["Yuvarlak", "Kare", "Dikdörtgen", "Oval", "Bar Tezgahı"] },
        ],
        extraInfoPlaceholder: "Örn: Deniz manzaralı, şömine yanı, özel dekorasyon, bebek sandalyesi var, engelli erişimi uygun...",
        tableColumns: [
            { key: "name", label: "Masa" },
            { key: "title", label: "Tip" },
            { key: "capacity", label: "Kapasite" },
            { key: "area", label: "Alan" },
        ],
        batchPlaceholder: "Masa 1\nMasa 2\nMasa 3\nBahçe 1\nBahçe 2\nVIP 1",
        excelMappableFields: [
            { key: "name", label: "Masa Adı / Numarası" },
            { key: "title", label: "Masa Tipi" },
            { key: "capacity", label: "Kapasite" },
            { key: "area", label: "Alan" },
            { key: "smoking", label: "Sigara" },
            { key: "reservable", label: "Rezerve Edilebilir" },
            { key: "window_seat", label: "Cam Kenarı" },
            { key: "shape", label: "Masa Şekli" },
            { key: "extra_info", label: "Ek Bilgiler" },
        ],
        photosEnabled: true,
        photoHint: "Masa veya alanın fotoğrafını yükleyin. AI asistan müşteriye rezervasyon önerirken bu görseli paylaşabilir.",
        detailUrlHint: "Restoranınızın web sitesinde mekan fotoğraflarının olduğu sayfa varsa URL'sini ekleyin.",
    },
    {
        id: "villa",
        label: "Villa / Apart",
        iconName: "Home",
        namePlaceholder: "Örn: Deniz Villa, Bahçe Apart 1, Sunset Suite",
        nameLabel: "Mülk Adı",
        titleLabel: "Mülk Tipi",
        titlePlaceholder: "Örn: Villa, Apart, Bungalov, Müstakil Ev",
        attributeFields: [
            { key: "property_type", label: "Mülk Kategorisi", type: "select", options: ["Villa", "Apart Daire", "Bungalov", "Müstakil Ev", "Dağ Evi", "Taş Ev", "Çiftlik Evi", "Tiny House", "Container Ev"] },
            { key: "capacity", label: "Kapasite", type: "number", placeholder: "6", suffix: "kişi" },
            { key: "bedroom_count", label: "Yatak Odası", type: "number", placeholder: "3", suffix: "oda" },
            { key: "bathroom_count", label: "Banyo Sayısı", type: "number", placeholder: "2", suffix: "banyo" },
            { key: "size_m2", label: "Büyüklük", type: "number", placeholder: "120", suffix: "m²" },
            { key: "view", label: "Manzara", type: "select", options: ["Deniz", "Göl", "Dağ", "Orman", "Şehir", "Bahçe", "Havuz", "Doğa"] },
            { key: "pool", label: "Özel Havuz", type: "checkbox" },
            { key: "garden", label: "Bahçe", type: "checkbox" },
            { key: "bbq", label: "Mangal / Barbekü", type: "checkbox" },
            { key: "wifi", label: "WiFi", type: "checkbox" },
            { key: "parking", label: "Otopark", type: "checkbox" },
            { key: "ac", label: "Klima", type: "checkbox" },
            { key: "heating", label: "Isıtma", type: "checkbox" },
            { key: "pet_friendly", label: "Evcil Hayvan Kabul", type: "checkbox" },
            { key: "min_stay", label: "Minimum Konaklama", type: "number", placeholder: "2", suffix: "gece" },
        ],
        extraInfoPlaceholder: "Örn: Denize 50m, jakuzi mevcut, özel plaj, tam donanımlı mutfak, şömine var, bahçede salıncak...",
        tableColumns: [
            { key: "name", label: "Mülk Adı" },
            { key: "title", label: "Tip" },
            { key: "capacity", label: "Kapasite" },
            { key: "view", label: "Manzara" },
        ],
        batchPlaceholder: "Deniz Villa\nBahçe Villa\nApart 1\nApart 2\nBungalov 1",
        excelMappableFields: [
            { key: "name", label: "Mülk Adı" },
            { key: "title", label: "Mülk Tipi" },
            { key: "property_type", label: "Mülk Kategorisi" },
            { key: "capacity", label: "Kapasite" },
            { key: "bedroom_count", label: "Yatak Odası" },
            { key: "bathroom_count", label: "Banyo Sayısı" },
            { key: "size_m2", label: "m²" },
            { key: "view", label: "Manzara" },
            { key: "pool", label: "Havuz" },
            { key: "garden", label: "Bahçe" },
            { key: "bbq", label: "Mangal" },
            { key: "wifi", label: "WiFi" },
            { key: "parking", label: "Otopark" },
            { key: "ac", label: "Klima" },
            { key: "heating", label: "Isıtma" },
            { key: "pet_friendly", label: "Evcil Hayvan" },
            { key: "min_stay", label: "Min. Konaklama" },
            { key: "extra_info", label: "Ek Bilgiler" },
        ],
        photosEnabled: true,
        photoHint: "Mülkün kapak fotoğrafını yükleyin. AI asistan müşteriye villa/apart önerirken bu görseli gönderecektir.",
        detailUrlHint: "Web sitenizde bu mülkün detaylı galeri sayfası varsa URL'sini ekleyin. AI asistan müşteriye 'Tüm fotoğraflar ve detaylar için' bu linki paylaşacaktır.",
    },
    {
        id: "studio",
        label: "Stüdyo",
        iconName: "Mic",
        namePlaceholder: "Örn: Studio A, Kaya Records, Ana Sahne",
        nameLabel: "Stüdyo Adı",
        titleLabel: "Stüdyo Tipi",
        titlePlaceholder: "Örn: Müzik Kayıt, Fotoğraf, Video, Film",
        attributeFields: [
            { key: "studio_type", label: "Stüdyo Türü", type: "select", options: ["Müzik Kayıt", "Fotoğraf", "Video", "Film"] },
            { key: "capacity", label: "Kapasite", type: "number", placeholder: "5", suffix: "kişi" },
            { key: "size_m2", label: "Alan", type: "number", placeholder: "40", suffix: "m²" },
            { key: "hourly_rate", label: "Saatlik Ücret", type: "text", placeholder: "Örn: 500 TL/saat" },
            { key: "daily_rate", label: "Günlük Ücret", type: "text", placeholder: "Örn: 3000 TL/gün" },
            { key: "soundproof", label: "Ses Yalıtımlı", type: "checkbox" },
            { key: "ac", label: "Klima", type: "checkbox" },
            { key: "parking", label: "Otopark", type: "checkbox" },
            { key: "wifi", label: "Wi-Fi", type: "checkbox" },
            { key: "equipment", label: "Sağlanan Ekipman", type: "multi-select", options: ["Mikrofon", "Mikser", "Amplifikatör", "Davul Seti", "Piyano/Klavye", "Işık Sistemi", "Green Screen", "Kamera", "Tripod", "Fon Perde", "Reflektör", "Teleprompter"] },
        ],
        extraInfoPlaceholder: "Örn: Profesyonel ses mühendisi desteği mevcut, 24 saat açık, kayıt sonrası mix-mastering hizmeti...",
        tableColumns: [
            { key: "name", label: "Stüdyo" },
            { key: "title", label: "Tip" },
            { key: "studio_type", label: "Tür" },
            { key: "capacity", label: "Kapasite" },
            { key: "size_m2", label: "m²" },
        ],
        batchPlaceholder: "Studio A\nStudio B\nStudio C",
        excelMappableFields: [
            { key: "name", label: "Stüdyo Adı" },
            { key: "title", label: "Stüdyo Tipi" },
            { key: "studio_type", label: "Tür" },
            { key: "capacity", label: "Kapasite" },
            { key: "size_m2", label: "Alan (m²)" },
            { key: "hourly_rate", label: "Saatlik Ücret" },
            { key: "daily_rate", label: "Günlük Ücret" },
            { key: "extra_info", label: "Ek Bilgiler" },
        ],
        photosEnabled: true,
        photoHint: "Stüdyonuzun kapak fotoğrafını yükleyin. AI asistan müşteriye stüdyo önerirken bu görseli gönderecektir.",
        detailUrlHint: "Web sitenizde bu stüdyonun detaylı tanıtım sayfası varsa URL'sini ekleyin. AI asistan müşteriye 'Detaylar ve görseller için' bu linki paylaşacaktır.",
    },
];

export function getResourceTypeConfig(type: ResourceType): ResourceTypeConfig {
    return RESOURCE_TYPES.find((r) => r.id === type) || RESOURCE_TYPES[0];
}

/** Kaynak özelliklerini okunabilir bir metin olarak formatlar */
export function formatResourceAttributes(resource: any): string {
    const config = getResourceTypeConfig(resource.resource_type || "employee");
    const attrs = resource.attributes || {};
    const parts: string[] = [];

    for (const field of config.attributeFields) {
        const val = attrs[field.key];
        if (val === undefined || val === null || val === "" || val === false) continue;

        if (field.type === "checkbox") {
            parts.push(field.label);
        } else if (Array.isArray(val)) {
            if (val.length > 0) parts.push(val.join(" + "));
        } else if (field.suffix) {
            parts.push(`${val} ${field.suffix}`);
        } else {
            parts.push(`${val}`);
        }
    }

    if (resource.extra_info) {
        parts.push(resource.extra_info);
    }

    return parts.join(", ");
}
