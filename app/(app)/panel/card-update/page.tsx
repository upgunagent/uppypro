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
        // Add CSS to force Iyzico popup to render inline within our container
        const style = document.createElement('style');
        style.id = 'iyzico-inline-override';
        style.textContent = `
            /* Hide Iyzico's overlay/backdrop */
            .iyzico-overlay,
            .iyzi-popup-overlay,
            div[style*="position: fixed"][style*="z-index"][style*="background"] {
                display: none !important;
            }

            /* Force the Iyzico popup container to render inline */
            #iyzipay-checkout-form-modal,
            .iyzico-modal,
            .iyzi-checkout-modal,
            div[class*="popup"] > div,
            #iyzipay-checkout-form iframe {
                position: relative !important;
                top: auto !important;
                left: auto !important;
                right: auto !important;
                bottom: auto !important;
                transform: none !important;
                width: 100% !important;
                max-width: 100% !important;
                height: auto !important;
                min-height: 500px !important;
                margin: 0 auto !important;
                z-index: 1 !important;
                box-shadow: none !important;
            }

            /* Target the Iyzico checkout iframe specifically */
            #iyzico-card-update-container iframe,
            #iyzipay-checkout-form iframe {
                position: relative !important;
                width: 100% !important;
                min-height: 500px !important;
                border: none !important;
                border-radius: 12px !important;
            }

            /* Prevent body scroll lock from Iyzico */
            body.iyzico-popup-active,
            body[style*="overflow: hidden"] {
                overflow: auto !important;
                padding-right: 0 !important;
            }
        `;
        document.head.appendChild(style);

        const init = async () => {
            try {
                const res = await initializeCardUpdate();
                if (res.error) {
                    setError(res.error);
                    setLoading(false);
                } else if (res.checkoutFormContent) {
                    setTimeout(() => {
                        const container = checkoutFormRef.current;
                        if (!container) return;

                        container.innerHTML = res.checkoutFormContent || '';

                        // Re-execute scripts
                        const scripts = container.querySelectorAll('script');
                        scripts.forEach(script => {
                            const newScript = document.createElement('script');

                            // Copy all attributes from the original script
                            Array.from(script.attributes).forEach(attr => {
                                newScript.setAttribute(attr.name, attr.value);
                            });

                            if (script.src) {
                                newScript.src = script.src;
                                newScript.async = true;
                            } else {
                                newScript.textContent = script.textContent;
                            }

                            container.appendChild(newScript);
                            script.remove();
                        });

                        // After Iyzico loads, move its popup content into our container
                        setTimeout(() => {
                            moveIyzicoPopupInline();
                        }, 1500);

                        // Keep checking and moving popup content
                        const interval = setInterval(() => {
                            moveIyzicoPopupInline();
                        }, 500);

                        // Stop checking after 10 seconds
                        setTimeout(() => clearInterval(interval), 10000);

                        setLoading(false);
                    }, 300);
                }
            } catch (e: any) {
                console.error(e);
                setError("Beklenmeyen bir hata oluştu.");
                setLoading(false);
            }
        };

        const moveIyzicoPopupInline = () => {
            const container = checkoutFormRef.current;
            if (!container) return;

            // Find Iyzico's popup iframe or content that was injected into body
            const iframes = document.querySelectorAll('iframe[src*="iyzipay"], iframe[src*="iyzico"]');
            iframes.forEach(iframe => {
                // If iframe is not inside our container, move it there
                if (!container.contains(iframe)) {
                    const iframeEl = iframe as HTMLIFrameElement;
                    iframeEl.style.position = 'relative';
                    iframeEl.style.width = '100%';
                    iframeEl.style.minHeight = '500px';
                    iframeEl.style.border = 'none';
                    iframeEl.style.borderRadius = '12px';
                    iframeEl.style.zIndex = '1';
                    container.appendChild(iframeEl);
                }
            });

            // Hide overlays
            document.querySelectorAll('.iyzico-overlay, .iyzi-popup-overlay').forEach(el => {
                (el as HTMLElement).style.display = 'none';
            });

            // Fix body overflow
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        };

        init();

        return () => {
            // Cleanup
            const styleEl = document.getElementById('iyzico-inline-override');
            if (styleEl) styleEl.remove();

            const selectors = [
                'script[src*="iyzipay"]',
                'script[src*="iyzico"]',
                'iframe[src*="iyzipay"]',
                'iframe[src*="iyzico"]',
                '#iyzipay-checkout-form',
                '.iyzico-popup',
                '.iyzico-overlay',
                '.iyzi-popup-overlay'
            ];
            document.querySelectorAll(selectors.join(', ')).forEach(el => el.remove());
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
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

            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm min-h-[400px] relative">
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10">
                        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                        <p className="text-slate-500 font-medium">Güvenli ödeme sayfası yükleniyor...</p>
                    </div>
                )}

                {error ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
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
                ) : (
                    <div id="iyzipay-checkout-form" className="responsive" ref={checkoutFormRef}></div>
                )}
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                <ShieldCheck className="w-4 h-4" />
                <span>256-bit SSL ile korunmaktadır. Kart bilgileriniz saklanmaz.</span>
            </div>
        </div>
    );
}
