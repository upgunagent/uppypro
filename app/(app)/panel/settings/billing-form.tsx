"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateBillingInfo } from "./actions";
import { useState } from "react";
import { Save, User, Building, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export function BillingForm({ billingInfo, profile }: { billingInfo: any, profile: any }) {
    const [billingType, setBillingType] = useState<"company" | "individual">(billingInfo?.billing_type || "company");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        try {
            const result = await updateBillingInfo(formData);
            if (result?.error) {
                toast({
                    variant: "destructive",
                    title: "Hata",
                    description: result.error,
                });
            } else {
                toast({
                    title: "Başarılı",
                    description: "Fatura bilgileri güncellendi.",
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Hata",
                description: "Bir hata oluştu.",
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <form action={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="col-span-1 md:col-span-2 flex items-center gap-2 mb-2">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <User className="text-primary w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-900">Hesap ve Fatura Bilgileri</h3>
                </div>

                {/* Common Fields */}
                <div className="space-y-4 col-span-1">
                    <div className="space-y-2">
                        <Label>Ad Soyad (Hesap Sahibi)</Label>
                        <Input disabled value={profile?.full_name || ""} className="bg-slate-50" />
                    </div>

                    <div className="space-y-2">
                        <Label>İletişim E-posta</Label>
                        <Input name="contactEmail" defaultValue={billingInfo?.contact_email || ""} placeholder="fatura@sirket.com" />
                    </div>

                    <div className="space-y-2">
                        <Label>İletişim Telefon</Label>
                        <Input name="contactPhone" defaultValue={billingInfo?.contact_phone || ""} placeholder="0555 123 45 67" />
                    </div>
                </div>

                <div className="col-span-1 md:col-span-2 border-t pt-6">
                    <div className="space-y-2 mb-4">
                        <Label>Fatura Tipi</Label>
                        <Select name="billingType" value={billingType} onValueChange={(v: "company" | "individual") => setBillingType(v)}>
                            <SelectTrigger className="w-full md:w-[200px]">
                                <SelectValue placeholder="Seçiniz" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="company">Şirket (LTD/A.Ş)</SelectItem>
                                <SelectItem value="individual">Şahıs Şirketi / Bireysel</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {billingType === "company" ? (
                            <>
                                <div className="space-y-2">
                                    <Label>Firma Ünvanı</Label>
                                    <Input name="companyName" defaultValue={billingInfo?.company_name || ""} placeholder="Örnek A.Ş." />
                                </div>
                                <div className="space-y-2">
                                    <Label>Yetkili Kişi Adı Soyad</Label>
                                    <Input name="authorizedPerson" defaultValue={billingInfo?.full_name || ""} placeholder="Ad Soyad" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Vergi Dairesi</Label>
                                    <Input name="taxOffice" defaultValue={billingInfo?.tax_office || ""} placeholder="Vergi Dairesi" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Vergi Numarası</Label>
                                    <Input name="taxNumber" defaultValue={billingInfo?.tax_number || ""} placeholder="Vergi No" />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <Label>Ad Soyad</Label>
                                    <Input name="fullName" defaultValue={billingInfo?.full_name || profile?.full_name} placeholder="Ad Soyad" />
                                </div>
                                <div className="space-y-2">
                                    <Label>TCKN</Label>
                                    <Input name="tckn" defaultValue={billingInfo?.tckn || ""} placeholder="TC Kimlik No" />
                                </div>
                            </>
                        )}

                        <div className="col-span-1 md:col-span-2 space-y-2">
                            <Label>Adres</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Input name="city" defaultValue={billingInfo?.address_city || ""} placeholder="İl" />
                                <Input name="district" defaultValue={billingInfo?.address_district || ""} placeholder="İlçe" />
                            </div>
                            <Input name="addressFull" defaultValue={billingInfo?.address_full || ""} placeholder="Açık Adres" className="mt-2" />
                        </div>
                    </div>
                </div>

                <div className="col-span-1 md:col-span-2 flex justify-end">
                    <Button type="submit" disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        {loading ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                    </Button>
                </div>
            </div>
        </form>
    );
}
