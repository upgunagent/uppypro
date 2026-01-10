export type PackageType = 'UppyPro Inbox' | 'UppyPro AI' | 'UppyPro Kurumsal';

export function getPackageName(subscription: any): PackageType {
    if (subscription?.ai_product_key === 'uppypro_enterprise') {
        return 'UppyPro Kurumsal';
    } else if (subscription?.ai_product_key === 'uppypro_ai') {
        return 'UppyPro AI';
    }
    return 'UppyPro Inbox';
}
