"use client";

import { AlertTriangle, Settings, RotateCcw } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface SubscriptionBlockOverlayProps {
    reason: 'canceled' | 'past_due' | 'unpaid' | 'suspended' | 'pending_payment';
}

export function SubscriptionBlockOverlay({ reason }: SubscriptionBlockOverlayProps) {
    const pathname = usePathname();

    // Settings sayfasında overlay gösterme (abonelik yenileme için erişim açık)
    if (pathname?.startsWith('/panel/settings')) {
        return null;
    }

    const isCanceled = reason === 'canceled';
    const isPendingPayment = reason === 'pending_payment';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full mx-4 p-8 text-center animate-in fade-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>

                <h2 className="text-2xl font-bold text-slate-900 mb-3">
                    {isCanceled ? 'Aboneliğiniz İptal Edildi' : isPendingPayment ? 'Ödeme Yöntemi Gerekli' : 'Ödeme Gecikmiş'}
                </h2>

                <p className="text-slate-600 mb-6 leading-relaxed">
                    {isCanceled
                        ? 'Aboneliğiniz iptal edilmiştir. Paneli kullanmaya devam etmek için lütfen aboneliğinizi yeniden başlatın.'
                        : isPendingPayment
                            ? 'Aboneliğiniz ücretli bir pakete yükseltilmiştir. Kullanıma devam etmek için lütfen kredi kartı bilgilerinizi girerek aboneliğinizi aktifleştirin.'
                            : 'Abonelik ödemeniz gecikmiştir. Hizmetlerinizin kesintisiz devam etmesi için lütfen ödemenizi güncelleyin.'
                    }
                </p>

                <div className="space-y-3">
                    <Link
                        href="/panel/settings?tab=subscription"
                        className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" />
                        {isCanceled ? 'Aboneliği Yeniden Başlat' : isPendingPayment ? 'Kart Bilgisi Girin' : 'Ödeme Bilgilerini Güncelle'}
                    </Link>
                    <Link
                        href="/panel/settings?tab=subscription"
                        className="flex items-center justify-center gap-2 w-full py-3 px-4 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                    >
                        <Settings className="w-4 h-4" />
                        Ayarlar Sayfasına Git
                    </Link>
                </div>

                <p className="text-xs text-slate-400 mt-6">
                    Yardıma ihtiyacınız varsa <a href="mailto:info@upgunai.com" className="text-blue-500 underline">info@upgunai.com</a> adresine yazabilirsiniz.
                </p>
            </div>
        </div>
    );
}
