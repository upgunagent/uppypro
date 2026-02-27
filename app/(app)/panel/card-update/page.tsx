"use client";

import { useEffect, useRef, useState } from "react";
import { initializeCardUpdate } from "@/app/actions/subscription";
import { Loader2, ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

export default function CardUpdatePage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const checkoutFormRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const init = async () => {
            try {
                const res = await initializeCardUpdate();
                if (res.error) {
                    setError(res.error);
                    setLoading(false);
                } else if (res.checkoutFormContent) {
                    const container = document.createElement("div");
                    container.innerHTML = res.checkoutFormContent;

                    // Execute Iyzico scripts safely in order
                    const scripts = Array.from(container.querySelectorAll('script'));
                    for (const script of scripts) {
                        const newScript = document.createElement('script');
                        Array.from(script.attributes).forEach(attr => {
                            newScript.setAttribute(attr.name, attr.value);
                        });

                        if (script.src) {
                            newScript.src = script.src;
                            newScript.async = false; // Strictly sequential
                        } else {
                            newScript.textContent = script.textContent;
                        }

                        document.body.appendChild(newScript);
                    }

                    setLoading(false);
                }
            } catch (e: any) {
                console.error(e);
                setError("Beklenmeyen bir hata oluştu: " + e.message);
                setLoading(false);
            }
        };

        init();

        return () => {
            // Cleanup on unmount
            const selectors = [
                'script[src*="iyzipay"]',
                'script[src*="iyzico"]',
                'iframe[src*="iyzipay"]',
                'iframe[src*="iyzico"]',
                '.iyzico-popup',
                '.iyzi-popup-overlay',
                '.iyzico-overlay'
            ];
            document.querySelectorAll(selectors.join(', ')).forEach(el => el.remove());
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';

            // Unset global Iyzico vars if they leak safely
            if (typeof window !== 'undefined') {
                try {
                    (window as any).iyziInit = undefined;
                    (window as any).iyziUcsInit = undefined;
                    (window as any).iyziSubscriptionInit = undefined;
                } catch (e) {
                    // Ignore strict mode deletion errors
                }
            }
        };
    }, []);

    const handleBack = () => {
        router.push("/panel/settings?tab=subscription");
    };

    return (
        <div className="max-w-[800px] mx-auto py-12 px-4 space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={handleBack}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Kart Bilgilerini Güncelle</h1>
                    <p className="text-slate-500">Güvenli ödeme altyapısı ile kartınızı güncelleyebilirsiniz.</p>
                </div>
            </div>

            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm min-h-[400px] relative flex flex-col items-center justify-center text-center">
                {loading && (
                    <div className="flex flex-col items-center">
                        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                        <h3 className="text-lg font-bold text-slate-900">Ödeme Sistemi Bağlanıyor</h3>
                        <p className="text-slate-500 font-medium mt-2">Iyzico güvenli kart güncelleme formu açılır pencere (popup) olarak başlatılıyor...</p>
                        <p className="text-xs text-slate-400 mt-4">Eğer popup açılmazsa tarayıcınızın engelleyici ayarlarını kontrol edin.</p>
                    </div>
                )}

                {error && (
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="p-3 bg-red-100 rounded-full">
                            <ShieldCheck className="w-8 h-8 text-red-600" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Başlatılamadı</h3>
                        <p className="text-red-600 bg-red-50 px-4 py-2 rounded-lg border border-red-100">
                            {error}
                        </p>
                        <Button onClick={handleBack} variant="outline" className="mt-4">
                            Geri Dön
                        </Button>
                    </div>
                )}

                {!loading && !error && (
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-2">
                            <ShieldCheck className="w-8 h-8 text-green-600" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Güvenli Bağlantı Kuruldu</h3>
                        <p className="text-slate-600 max-w-md">Eğer ekranınızda popup açılmazsa aşağıdaki alanda form yüklenecektir.</p>
                        <div id="iyzipay-checkout-form" className="popup" ref={checkoutFormRef}></div>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                <ShieldCheck className="w-4 h-4" />
                <span>256-bit SSL ile korunmaktadır. Kart bilgileriniz saklanmaz.</span>
            </div>
        </div>
    );
}
