export type PackageType = string;

export function getPackageName(subscription: any): PackageType {
    const key = subscription?.ai_product_key;
    if (key === 'uppypro_corporate_free') return 'UppyPro Kurumsal (Ücretsiz)';
    if (key === 'uppypro_corporate_small') return 'UppyPro Kurumsal (Small)';
    if (key === 'uppypro_corporate_medium') return 'UppyPro Kurumsal (Medium)';
    if (key === 'uppypro_corporate_large') return 'UppyPro Kurumsal (Large)';
    if (key === 'uppypro_corporate_xl') return 'UppyPro Kurumsal (XL)';
    if (key === 'uppypro_ai') return 'UppyPro AI';
    if (key === 'uppypro_ai_trendyol') return 'UppyPro AI Trendyol';
    return 'UppyPro Inbox';
}

export function isKurumsal(subscription: any): boolean {
    const key = subscription?.ai_product_key || '';
    return key.startsWith('uppypro_corporate');
}

export function isTrendyolAllowed(subscription: any): boolean {
    const key = subscription?.ai_product_key || '';
    return key.startsWith('uppypro_corporate') || key === 'uppypro_ai_trendyol';
}

// ─── Paket Hiyerarşisi ─────────────────────────────────────────────

/** Self-service paketlerin sıralaması (düşükten yükseğe) */
export const PLAN_HIERARCHY: Record<string, number> = {
    'uppypro_inbox': 1,
    'uppypro_ai': 2,
    'uppypro_ai_trendyol': 3,
};

/** Self-service paketler (kurumsal hariç) */
export const SELF_SERVICE_PLANS = ['uppypro_inbox', 'uppypro_ai', 'uppypro_ai_trendyol'] as const;

export function getPlanLevel(productKey: string): number {
    return PLAN_HIERARCHY[productKey] || 0;
}

export function isPlanUpgrade(fromKey: string, toKey: string): boolean {
    return getPlanLevel(toKey) > getPlanLevel(fromKey);
}

export function isPlanDowngrade(fromKey: string, toKey: string): boolean {
    return getPlanLevel(toKey) < getPlanLevel(fromKey);
}

/** Her paketin kısa açıklaması ve öne çıkan özellikleri */
export const PLAN_FEATURES: Record<string, { description: string; features: string[] }> = {
    'uppypro_inbox': {
        description: 'Temel mesaj yönetimi özellikleri',
        features: ['WhatsApp mesaj yönetimi', 'Hazır cevap şablonları', 'Kampanya gönderimi'],
    },
    'uppypro_ai': {
        description: 'Yapay zeka destekli otomatik asistan',
        features: ['AI otomatik yanıtlar', 'Randevu & takvim yönetimi', 'Kaynak yönetimi', 'CRM'],
    },
    'uppypro_ai_trendyol': {
        description: 'AI Asistan + Trendyol mağaza entegrasyonu',
        features: ['Tüm AI özellikleri', 'Trendyol mağaza bağlantısı', 'Ürün önerme & sipariş sorgulama', 'İade yönetimi'],
    },
};
