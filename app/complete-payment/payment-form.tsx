"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CreditCard } from "lucide-react";
import { activateSubscription } from "@/app/actions/enterprise";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

export function PaymentForm({ tenantId, amount, inviteToken }: { tenantId: string, amount: number, inviteToken?: string }) {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'payment' | 'password'>('payment');
    const router = useRouter();
    const { toast } = useToast();

    // Payment state
    const [cardHolder, setCardHolder] = useState("Kurumsal Üye");
    const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");

    // Password state
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");

    const handlePay = async () => {
        setLoading(true);
        try {
            // activateSubscription with card data
            const res = await activateSubscription(tenantId, {
                cardHolder,
                cardNumber: cardNumber.replace(/\s/g, ''), // Remove spaces
                inviteToken // Pass token to mark as used
            });

            if (res.error) {
                toast({ variant: "destructive", title: "Hata", description: res.error });
                setLoading(false);
            } else {
                toast({ title: "Ödeme Başarılı", description: "Lütfen hesabınız için şifre belirleyin." });
                setLoading(false);
                setStep('password');
            }
        } catch (e) {
            console.error(e);
            setLoading(false);
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
        if (!inviteToken) {
            toast({ variant: "destructive", title: "Hata", description: "Token bulunamadı." });
            return;
        }

        setLoading(true);
        try {
            const { setPasswordEnterprise } = await import("@/app/actions/enterprise");
            const res = await setPasswordEnterprise(inviteToken, password);

            if (res.error) {
                toast({ variant: "destructive", title: "Hata", description: res.error });
                setLoading(false);
            } else {
                toast({ title: "Hesap Oluşturuldu!", description: "Giriş sayfasına yönlendiriliyorsunuz..." });
                router.push("/login?verified=true");
            }
        } catch (e) {
            console.error(e);
            toast({ variant: "destructive", title: "Hata", description: "Bir hata oluştu." });
            setLoading(false);
        }
    };

    if (step === 'password') {
        return (
            <div className="space-y-6">
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mb-4">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Ödeme Başarılı!</h2>
                    <p className="text-sm text-slate-500">Hesabınıza erişmek için son adımı tamamlayın.</p>
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
            <div className="space-y-4">
                <div className="relative">
                    <CreditCard className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                    <Input
                        placeholder="Kart Numarası"
                        className="pl-10 font-mono"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Input placeholder="AA/YY" className="font-mono text-center" defaultValue="12/30" />
                    <Input placeholder="CVC" className="font-mono text-center" maxLength={3} defaultValue="123" />
                </div>
                <Input
                    placeholder="Kart Üzerindeki İsim"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                />
                <div className="text-xs text-orange-600 font-bold text-center mt-2">
                    * Güvenli Ödeme Simülasyonu (Test Kartı Kullanılabilir)
                </div>
            </div>

            <Button onClick={handlePay} disabled={loading} className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-lg shadow-lg shadow-orange-500/20">
                {loading ? <><Loader2 className="animate-spin mr-2" /> İşleniyor...</> : `Ödeme Yap (${amount.toLocaleString('tr-TR')} TL)`}
            </Button>
        </div>
    );
}
