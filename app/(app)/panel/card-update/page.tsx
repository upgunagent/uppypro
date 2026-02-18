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
                    // Inject script and content
                    if (checkoutFormRef.current) {
                        checkoutFormRef.current.innerHTML = res.checkoutFormContent!;

                        // Execute scripts
                        const scripts = checkoutFormRef.current.querySelectorAll("script");
                        scripts.forEach(oldScript => {
                            const newScript = document.createElement("script");
                            Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                            newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                            oldScript.parentNode?.replaceChild(newScript, oldScript);
                        });
                    }
                    setLoading(false);
                }
            } catch (e: any) {
                console.error(e);
                setError("Beklenmeyen bir hata oluştu.");
                setLoading(false);
            }
        };

        init();
    }, []);

    const handleBack = () => {
        router.push("/panel/settings");
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
