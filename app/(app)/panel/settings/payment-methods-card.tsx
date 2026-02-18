"use client";

import { Button } from "@/components/ui/button";
import { CreditCard, ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

export function PaymentMethodsCard({ methods, subscription }: { methods: any[], subscription?: any }) {
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const status = urlParams.get('status');
            const reason = urlParams.get('reason');

            if (status === 'card_update_success') {
                toast({ title: "Başarılı", description: "Kart bilgileriniz güncellendi." });
                // Clean URL
                window.history.replaceState({}, '', window.location.pathname);
            } else if (status === 'card_update_fail') {
                toast({ variant: "destructive", title: "Hata", description: reason || "Kart güncelleme başarısız." });
                window.history.replaceState({}, '', window.location.pathname);
            }
        }
    }, [toast]);

    const handleUpdateCard = () => {
        router.push("/panel/card-update");
    };

    return (
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                        <CreditCard className="text-emerald-600 w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-900">Ödeme Yöntemi</h3>
                        {subscription?.card_last4 ? (
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-700">
                                    {subscription.card_brand} **** {subscription.card_last4}
                                </span>
                                <span className="text-xs text-slate-500">
                                    {subscription.card_association}
                                </span>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500">Kayıtlı kartınızı güncelleyebilirsiniz.</p>
                        )}
                    </div>
                </div>

                <Button variant="outline" size="sm" onClick={handleUpdateCard}>
                    Kartı Güncelle
                    <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </div>

            <div className="text-sm text-slate-500 italic">
                Aboneliğinizin devam etmesi için kredi kartı bilgilerinizin güncel olması gerekmektedir.
                Iyzico altyapısı sayesinde kart bilgileriniz tarafımızca saklanmadan, güvenle işlenir.
            </div>
        </div>
    );
}
