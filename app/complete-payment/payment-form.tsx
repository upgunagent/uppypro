"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { initializeSubscriptionPayment } from "@/app/actions/payment";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";

type PaymentFormProps = {
    tenantId: string;
    amount: number;
    inviteToken?: string;
    pricingPlanReferenceCode?: string;
    userData: {
        email: string;
        name: string;
        phone: string;
        address: string;
        city: string;
        district: string;
        identityNumber?: string;
    }
};

export function PaymentForm({ tenantId, amount, inviteToken, pricingPlanReferenceCode, userData }: PaymentFormProps) {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'init' | 'payment' | 'password' | 'success'>('init');
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const checkoutFormRef = useRef<HTMLDivElement>(null);

    // Password state
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");

    // Handle magic link token in URL hash (from Iyzico callback redirect)
    useEffect(() => {
        const hash = window.location.hash;
        if (!hash || !hash.includes('access_token')) return;

        const params = new URLSearchParams(hash.substring(1)); // Remove leading #
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
            console.log('[AUTH] Magic link token detected in hash, establishing session...');
            import('@/lib/supabase/client').then(({ createClient }) => {
                const supabase = createClient();
                supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
                    .then(({ error }) => {
                        if (error) {
                            console.error('[AUTH] Failed to set session:', error);
                        } else {
                            console.log('[AUTH] Session established, reloading...');
                            // Clear hash and reload so server component sees authenticated user
                            window.location.href = window.location.pathname + '?status=success';
                        }
                    });
            });
        }
    }, []);

    // Check for callback status
    useEffect(() => {
        const status = searchParams.get('status');
        const reason = searchParams.get('reason');

        if (status === 'success') {
            setStep('password');
            toast({ title: "Ödeme Başarılı", description: "Lütfen hesabınız için şifre belirleyin." });
        } else if (status === 'fail') {
            setStep('init');
            toast({ variant: "destructive", title: "Ödeme Başarısız", description: reason || "İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin." });
        }
    }, [searchParams, toast]);

    const handleStartPayment = async () => {
        if (!pricingPlanReferenceCode) {
            toast({ variant: "destructive", title: "Hata", description: "Ödeme planı bulunamadı. Lütfen yönetici ile iletişime geçin." });
            return;
        }

        setLoading(true);
        try {
            const res = await initializeSubscriptionPayment({
                pricingPlanReferenceCode: pricingPlanReferenceCode,
                user: {
                    id: userData.email, // Passing email as ID for Iyzico customer ref if needed
                    email: userData.email,
                    name: userData.name,
                    phone: userData.phone,
                    address: `${userData.address} ${userData.district}/${userData.city}`,
                    identityNumber: userData.identityNumber
                },
                tenantId: tenantId
            });

            if (res.error) {
                toast({ variant: "destructive", title: "Hata", description: res.error });
                setLoading(false);
            } else if (res.checkoutFormContent) {
                // DEBUG: Show user the callback URL being used
                if (res.debugCallbackUrl) {
                    console.log("DEBUG: Callback URL SENT:", res.debugCallbackUrl);
                    console.log("DEBUG: Conversation ID SENT:", res.debugConversationId);
                    // toast({ title: "Debug", description: `Callback: ${res.debugCallbackUrl}` }); 
                }

                setStep('payment');
                setLoading(false);

                // Inject Iyzico Script
                // Iyzico returns raw HTML with script tags. We need to execute the script.
                // We'll put the HTML in the div, then extract and run the script.
                setTimeout(() => {
                    if (checkoutFormRef.current) {
                        checkoutFormRef.current.innerHTML = res.checkoutFormContent!;

                        const scripts = checkoutFormRef.current.querySelectorAll("script");
                        scripts.forEach(oldScript => {
                            const newScript = document.createElement("script");
                            Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                            newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                            oldScript.parentNode?.replaceChild(newScript, oldScript);
                        });
                    }
                }, 100);
            }
        } catch (e) {
            console.error(e);
            setLoading(false);
            toast({ variant: "destructive", title: "Hata", description: "Bağlantı hatası." });
        }
    };

    const handleSetPassword = async () => {
        if (password.length < 6) {
            toast({ variant: "destructive", title: "Hata", description: "Şifre en az 6 karakter olmalıdır." });
            return;
        }
        if (password !== passwordConfirm) {
            toast({ variant: "destructive", title: "Hata", description: "Şifreler eşleşmiyor." });
            return;
        }

        setLoading(true);
        try {
            const { createClient } = await import("@/lib/supabase/client");
            const supabase = createClient();
            const { error } = await supabase.auth.updateUser({ password: password });

            if (error) {
                toast({ variant: "destructive", title: "Hata", description: error.message });
                setLoading(false);
            } else {
                setLoading(false);
                setStep('success');
                // Sign out so user logs in fresh with their new password
                const { createClient: createClientFn } = await import("@/lib/supabase/client");
                const supabase = createClientFn();
                await supabase.auth.signOut();
            }
        } catch (e) {
            console.error(e);
            toast({ variant: "destructive", title: "Hata", description: "Bir hata oluştu." });
            setLoading(false);
        }
    };

    if (step === 'success') {
        return (
            <div className="text-center space-y-6 py-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-600 mb-2 animate-in zoom-in duration-300">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Hesabınız Hazır! 🎉</h2>
                <p className="text-slate-600 max-w-sm mx-auto">
                    Şifreniz başarıyla oluşturuldu. Giriş yaparak panelinize erişebilirsiniz.
                </p>
                <Button
                    onClick={() => router.push("/login")}
                    className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-lg shadow-lg shadow-orange-500/20 mt-4"
                >
                    Giriş Yap
                </Button>
            </div>
        );
    }

    if (step === 'password') {
        return (
            <div className="space-y-6">
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mb-4">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Ödeme Onaylandı</h2>
                    <p className="text-sm text-slate-500">Hesap güvenliğiniz için şifrenizi belirleyin.</p>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Yeni Şifre</label>
                        <Input
                            type="password"
                            placeholder="******"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Şifre Tekrar</label>
                        <Input
                            type="password"
                            placeholder="******"
                            value={passwordConfirm}
                            onChange={(e) => setPasswordConfirm(e.target.value)}
                        />
                    </div>
                </div>

                <Button onClick={handleSetPassword} disabled={loading} className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-lg">
                    {loading ? <><Loader2 className="animate-spin mr-2" /> Kaydediliyor...</> : "Şifreyi Belirle ve Tamamla"}
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {step === 'init' && (
                <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="text-sm text-blue-800">
                            Ödemeniz <strong>Iyzico</strong> güvencesiyle 256-bit SSL korumalı altyapı üzerinden alınacaktır. Kart bilgileriniz Iyzico tarafından saklanacaktır.
                        </div>
                    </div>

                    <Button onClick={handleStartPayment} disabled={loading} className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-lg shadow-lg shadow-orange-500/20">
                        {loading ? <><Loader2 className="animate-spin mr-2" /> Ödeme Sayfasını Hazırlanıyor...</> : "Güvenli Ödeme Başlat"}
                    </Button>
                </div>
            )}

            <div className={`${step === 'payment' ? 'block' : 'hidden'} w-full min-h-[600px] border border-slate-200 rounded-xl overflow-hidden bg-white`}>
                <div id="iyzipay-checkout-form" className="responsive" ref={checkoutFormRef}></div>
            </div>
        </div>
    );
}
