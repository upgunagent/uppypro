"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { initializeCardUpdate } from "@/app/actions/subscription";
import { CreditCard, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";

export function PaymentMethodsCard({ methods, subscription }: { methods: any[], subscription?: any }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const checkoutFormRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

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

    const handleUpdateCard = async () => {
        setLoading(true);
        try {
            const res = await initializeCardUpdate();
            if (res.error) {
                toast({ variant: "destructive", title: "Hata", description: res.error });
                setLoading(false);
                setOpen(false);
            } else if (res.checkoutFormContent) {
                // Inject script
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
            toast({ variant: "destructive", title: "Hata", description: "Bir hata oluştu." });
            setLoading(false);
            setOpen(false);
        }
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

                <Dialog open={open} onOpenChange={(val) => {
                    setOpen(val);
                    if (val) {
                        handleUpdateCard();
                    } else {
                        setLoading(false); // Reset
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                            Kartı Güncelle
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Kart Güncelleme</DialogTitle>
                            <DialogDescription>
                                Iyzico güvenli ödeme sayfası yükleniyor...
                            </DialogDescription>
                        </DialogHeader>

                        <div className="min-h-[400px] flex items-center justify-center">
                            {loading && <Loader2 className="w-8 h-8 animate-spin text-primary" />}
                            <div id="iyzipay-checkout-form" className="responsive w-full" ref={checkoutFormRef}></div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="text-sm text-slate-500 italic">
                Aboneliğinizin devam etmesi için kredi kartı bilgilerinizin güncel olması gerekmektedir.
                Iyzico altyapısı sayesinde kart bilgileriniz tarafımızca saklanmadan, güvenle işlenir.
            </div>
        </div>
    );
}
