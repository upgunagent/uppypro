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
    const router = useRouter();
    const { toast } = useToast();

    // Simple state for inputs
    const [cardHolder, setCardHolder] = useState("Kurumsal Üye");
    const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");

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
                toast({ title: "Başarılı", description: "Ödeme alındı. Şifre ekranına yönlendiriliyorsunuz..." });
                router.push(res.redirectUrl || "/update-password");
            }
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

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
