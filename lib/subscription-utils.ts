export type PackageType = string;

export function getPackageName(subscription: any): PackageType {
    const key = subscription?.ai_product_key;
    if (key === 'uppypro_corporate_free') return 'UppyPro Kurumsal (Ücretsiz)';
    if (key === 'uppypro_corporate_small') return 'UppyPro Kurumsal (Small)';
    if (key === 'uppypro_corporate_medium') return 'UppyPro Kurumsal (Medium)';
    if (key === 'uppypro_corporate_large') return 'UppyPro Kurumsal (Large)';
    if (key === 'uppypro_corporate_xl') return 'UppyPro Kurumsal (XL)';
    if (key === 'uppypro_enterprise') return 'UppyPro Kurumsal';
    if (key === 'uppypro_ai') return 'UppyPro AI';
    if (key === 'uppypro_ai_trendyol') return 'UppyPro AI Trendyol';
    return 'UppyPro Inbox';
}

export function isKurumsal(subscription: any): boolean {
    const key = subscription?.ai_product_key || '';
    return key.startsWith('uppypro_corporate') || key === 'uppypro_enterprise';
}

export function isTrendyolAllowed(subscription: any): boolean {
    const key = subscription?.ai_product_key || '';
    return key.startsWith('uppypro_corporate') || key === 'uppypro_enterprise' || key === 'uppypro_ai_trendyol';
}
