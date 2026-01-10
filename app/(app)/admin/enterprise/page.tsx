"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createEnterpriseInvite } from "@/app/actions/enterprise";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Send } from "lucide-react";

export default function EnterpriseInvitePage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    async function handleSubmit(formData: FormData) {
        setLoading(true);

        const data = {
            companyName: formData.get("companyName") as string,
            fullName: formData.get("fullName") as string,
            email: formData.get("email") as string,
            phone: formData.get("phone") as string,
            monthlyPrice: Number(formData.get("monthlyPrice")),
        };

        const res = await createEnterpriseInvite(data);

        setLoading(false);

        if (res.error) {
            toast({ variant: "destructive", title: "Hata", description: res.error });
        } else {
            toast({ title: "Başarılı", description: "Davet e-postası gönderildi." });
            // Reset form manually or reload
            (document.getElementById("invite-form") as HTMLFormElement)?.reset();
        }
    }

    return (
        <div className="p-8 max-w-2xl">
            <h1 className="text-3xl font-bold mb-2">Kurumsal Üyelik Oluştur</h1>
            <p className="text-slate-500 mb-8">
                Buradan özel fiyatlı UppyPro Kurumsal aboneliği oluşturabilir ve davet gönderebilirsiniz.
            </p>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <form id="invite-form" action={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Şirket Adı</Label>
                        <Input name="companyName" required placeholder="Firma Ünvanı" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Yetkili Ad Soyad</Label>
                            <Input name="fullName" required placeholder="Ad Soyad" />
                        </div>
                        <div className="space-y-2">
                            <Label>Telefon</Label>
                            <Input name="phone" required placeholder="0555..." />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>E-posta Adresi</Label>
                        <Input name="email" type="email" required placeholder="yetkili@sirket.com" />
                    </div>

                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg space-y-2">
                        <Label className="text-orange-900">Aylık Abonelik Ücreti (TL)</Label>
                        <Input
                            name="monthlyPrice"
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            className="bg-white border-orange-200 focus-visible:ring-orange-500"
                            placeholder="Örn: 15000"
                        />
                        <p className="text-xs text-orange-700">Bu tutar üzerinden fatura kesilecek ve ödeme alınacaktır.</p>
                    </div>

                    <div className="pt-4">
                        <Button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800">
                            {loading ? <Loader2 className="animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                            Davet Gönder
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
