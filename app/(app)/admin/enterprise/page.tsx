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
    const [billingType, setBillingType] = useState<'corporate' | 'individual'>('corporate');

    async function handleSubmit(formData: FormData) {
        setLoading(true);

        const data = {
            billingType: billingType,
            companyName: billingType === 'corporate' ? formData.get("companyName") as string : "Bireysel - " + formData.get("fullName") as string,
            fullName: billingType === 'individual' ? formData.get("fullName") as string : formData.get("contactName") as string,
            contactName: formData.get("contactName") as string,
            email: formData.get("email") as string,
            phone: formData.get("phone") as string,
            taxOffice: formData.get("taxOffice") as string,
            taxNumber: formData.get("taxNumber") as string,
            tckn: formData.get("tckn") as string,
            address: formData.get("address") as string,
            city: formData.get("city") as string,
            district: formData.get("district") as string,
            planKey: formData.get("planKey") as string,
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
                    {/* Billing Type Selection */}
                    <div className="space-y-2">
                        <Label>Üyelik Tipi</Label>
                        <div className="flex gap-4">
                            <label className="flex items-center space-x-2 cursor-pointer border p-3 rounded-lg flex-1 has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50">
                                <input
                                    type="radio"
                                    name="billingType"
                                    value="corporate"
                                    defaultChecked={billingType === 'corporate'}
                                    className="accent-orange-600"
                                    onChange={(e) => setBillingType(e.target.value as 'corporate' | 'individual')}
                                />
                                <span className="font-medium">Kurumsal (Şirket)</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer border p-3 rounded-lg flex-1 has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50">
                                <input
                                    type="radio"
                                    name="billingType"
                                    value="individual"
                                    defaultChecked={billingType === 'individual'}
                                    className="accent-orange-600"
                                    onChange={(e) => setBillingType(e.target.value as 'corporate' | 'individual')}
                                />
                                <span className="font-medium">Bireysel (Şahıs)</span>
                            </label>
                        </div>
                    </div>

                    {billingType === 'corporate' && (
                        <>
                            <div className="space-y-2">
                                <Label>Şirket Ünvanı</Label>
                                <Input name="companyName" required placeholder="Tam Şirket Ünvanı" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Vergi Dairesi</Label>
                                    <Input name="taxOffice" required placeholder="Vergi Dairesi" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Vergi Numarası</Label>
                                    <Input name="taxNumber" required placeholder="Vergi No" />
                                </div>
                            </div>
                        </>
                    )}

                    {billingType === 'individual' && (
                        <>
                            <div className="space-y-2">
                                <Label>Ad Soyad (Fatura Sahibi)</Label>
                                <Input name="fullName" required placeholder="Ad Soyad" />
                                {/* Hidden input to satisfy legacy requirements if needed, or handled in handleSubmit */}
                            </div>
                            <div className="space-y-2">
                                <Label>TC Kimlik No</Label>
                                <Input name="tckn" required placeholder="11 Haneli TCKN" maxLength={11} />
                            </div>
                        </>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{billingType === 'corporate' ? 'Yetkili Ad Soyad' : 'İletişim Ad Soyad'}</Label>
                            <Input name="contactName" required placeholder="Ad Soyad" />
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

                    <div className="space-y-2">
                        <Label>Fatura Adresi</Label>
                        <textarea
                            name="address"
                            required
                            className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Açık adres..."
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>İl</Label>
                            <Input name="city" required placeholder="İstanbul" />
                        </div>
                        <div className="space-y-2">
                            <Label>İlçe</Label>
                            <Input name="district" required placeholder="Beşiktaş" />
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <Label className="text-lg font-semibold block">Paket Seçimi</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { key: 'uppypro_corporate_small', name: 'Small', price: '4.995 TL + KDV' },
                                { key: 'uppypro_corporate_medium', name: 'Medium', price: '6.995 TL + KDV' },
                                { key: 'uppypro_corporate_large', name: 'Large', price: '9.995 TL + KDV' },
                                { key: 'uppypro_corporate_xl', name: 'XL', price: '12.995 TL + KDV' }
                            ].map((plan) => (
                                <label key={plan.key} className="flex flex-col space-y-1 cursor-pointer border p-4 rounded-lg has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50 hover:bg-slate-50 transition-colors relative">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-900">{plan.name}</span>
                                        <input
                                            type="radio"
                                            name="planKey"
                                            value={plan.key}
                                            required
                                            defaultChecked={plan.key === 'uppypro_corporate_medium'}
                                            className="accent-orange-600 w-5 h-5"
                                        />
                                    </div>
                                    <span className="text-orange-600 font-semibold">{plan.price}</span>
                                    <span className="text-xs text-slate-500">Aylık Abonelik</span>
                                </label>
                            ))}
                        </div>
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
