"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Check, Loader2, CreditCard, Building2, User } from "lucide-react";
import { clsx } from "clsx";
import Link from "next/link";

// Types
export type WizardData = {
    plan: string;
    // Account
    fullName: string;
    email: string;
    phone: string;
    // Billing
    billingType: "individual" | "corporate";
    tcKn?: string;
    companyName?: string;
    taxOffice?: string;
    taxNumber?: string;
    address: string;
    city: string;
    district: string;
    // Agreements
    kvkk: boolean;
    terms: boolean;
    marketing: boolean;
};

interface StepProps {
    data: WizardData;
    updateData: (key: keyof WizardData, value: any) => void;
    onNext: () => void;
    onBack?: () => void;
}

// 1. Plan Summary
export function StepSummary({ data, onNext }: StepProps) {
    const plans: Record<string, { name: string, price: number }> = {
        "base": { name: "UppyPro Inbox", price: 495 },
        "ai_starter": { name: "UppyPro AI Başlangıç", price: 2499 },
        "ai_medium": { name: "UppyPro AI Orta", price: 4999 },
        "ai_pro": { name: "UppyPro AI Profesyonel", price: 8999 },
    };

    const selectedPlan = plans[data.plan] || plans["base"];
    const kdv = selectedPlan.price * 0.20;
    const total = selectedPlan.price + kdv;

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Seçilen Paket Özeti</h3>
                <p className="text-slate-500 text-sm">Lütfen seçiminizi kontrol edin ve devam edin.</p>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
                    <div>
                        <div className="font-bold text-lg text-slate-900">{selectedPlan.name}</div>
                        <div className="text-xs text-slate-500">Aylık Abonelik</div>
                    </div>
                    <div className="font-bold text-lg">{selectedPlan.price.toLocaleString('tr-TR')} TL</div>
                </div>
                <div className="flex justify-between items-center text-sm text-slate-500 mb-2">
                    <div>KDV (%20)</div>
                    <div>{kdv.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL</div>
                </div>
                <div className="flex justify-between items-center font-bold text-xl text-orange-600 mt-4 pt-4 border-t border-slate-200">
                    <div>Toplam</div>
                    <div>{total.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL</div>
                </div>
            </div>

            <Button onClick={onNext} className="w-full h-12 text-lg bg-orange-600 hover:bg-orange-700">
                Devam Et
            </Button>
            <div className="text-center">
                <Link href="/#pricing" className="text-sm text-slate-400 hover:text-orange-600 underline">Paketi Değiştir</Link>
            </div>
        </div>
    );
}

// 2. Account Info
export function StepAccount({ data, updateData, onNext, onBack }: StepProps) {
    const isValid = data.fullName && data.email && data.phone;

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Hesap Bilgileri</h3>
                <p className="text-slate-500 text-sm">Giriş bilgileriniz bu e-posta adresine gönderilecektir.</p>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>Ad Soyad</Label>
                    <Input
                        placeholder="Örn: Ahmet Yılmaz"
                        value={data.fullName}
                        onChange={(e) => updateData("fullName", e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label>E-posta Adresi</Label>
                    <Input
                        type="email"
                        placeholder="ornek@sirket.com"
                        value={data.email}
                        onChange={(e) => updateData("email", e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Telefon Numarası</Label>
                    <Input
                        type="tel"
                        placeholder="0555 555 55 55"
                        value={data.phone}
                        onChange={(e) => updateData("phone", e.target.value)}
                    />
                </div>
                <div className="bg-blue-50 text-blue-700 p-4 rounded-lg text-sm flex gap-3">
                    <div className="mt-0.5">ℹ️</div>
                    <div>Ödeme işlemi tamamlandıktan sonra kullanıcı adı ve geçici şifreniz yukarıdaki e-posta adresine gönderilecektir.</div>
                </div>
            </div>

            <div className="flex gap-4">
                <Button variant="outline" onClick={onBack} className="w-full">Geri</Button>
                <Button onClick={onNext} disabled={!isValid} className="w-full bg-orange-600 hover:bg-orange-700">Devam Et</Button>
            </div>
        </div>
    );
}

// 3. Billing Type
export function StepBillingType({ data, updateData, onNext, onBack }: StepProps) {
    return (
        <div className="space-y-6">
            <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Fatura Tipi</h3>
                <p className="text-slate-500 text-sm">Lütfen fatura kesilecek mükellef türünü seçin.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div
                    onClick={() => updateData("billingType", "individual")}
                    className={clsx(
                        "cursor-pointer border-2 rounded-xl p-6 text-center transition-all hover:border-orange-300",
                        data.billingType === "individual" ? "border-orange-600 bg-orange-50" : "border-slate-100 bg-white"
                    )}
                >
                    <User className={clsx("w-8 h-8 mx-auto mb-3", data.billingType === "individual" ? "text-orange-600" : "text-slate-400")} />
                    <div className="font-semibold text-slate-900">Şahıs / Bireysel</div>
                </div>
                <div
                    onClick={() => updateData("billingType", "corporate")}
                    className={clsx(
                        "cursor-pointer border-2 rounded-xl p-6 text-center transition-all hover:border-orange-300",
                        data.billingType === "corporate" ? "border-orange-600 bg-orange-50" : "border-slate-100 bg-white"
                    )}
                >
                    <Building2 className={clsx("w-8 h-8 mx-auto mb-3", data.billingType === "corporate" ? "text-orange-600" : "text-slate-400")} />
                    <div className="font-semibold text-slate-900">Kurumsal Şirket</div>
                </div>
            </div>

            <div className="flex gap-4">
                <Button variant="outline" onClick={onBack} className="w-full">Geri</Button>
                <Button onClick={onNext} className="w-full bg-orange-600 hover:bg-orange-700">Devam Et</Button>
            </div>
        </div>
    )
}

// 4. Billing Details
export function StepBillingDetails({ data, updateData, onNext, onBack }: StepProps) {
    const isCorporate = data.billingType === "corporate";
    const isValid = data.address && data.city && data.district && (isCorporate ? (data.companyName && data.taxOffice && data.taxNumber) : (data.tcKn && data.fullName));

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Fatura Bilgileri</h3>
                <p className="text-slate-500 text-sm">Yasal zorunluluk gereği lütfen eksiksiz doldurun.</p>
            </div>

            <div className="space-y-4">
                {isCorporate ? (
                    <>
                        <div className="space-y-2">
                            <Label>Firma Ünvanı</Label>
                            <Input placeholder="Şirket tam adı" value={data.companyName || ""} onChange={(e) => updateData("companyName", e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Vergi Dairesi</Label>
                                <Input value={data.taxOffice || ""} onChange={(e) => updateData("taxOffice", e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Vergi Numarası</Label>
                                <Input value={data.taxNumber || ""} onChange={(e) => updateData("taxNumber", e.target.value)} />
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="space-y-2">
                            <Label>Ad Soyad</Label>
                            <Input value={data.fullName} disabled className="bg-slate-50" />
                        </div>
                        <div className="space-y-2">
                            <Label>TC Kimlik Numarası</Label>
                            <Input placeholder="11 haneli TC no" maxLength={11} value={data.tcKn || ""} onChange={(e) => updateData("tcKn", e.target.value)} />
                        </div>
                    </>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>İl</Label>
                        <Input value={data.city || ""} onChange={(e) => updateData("city", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>İlçe</Label>
                        <Input value={data.district || ""} onChange={(e) => updateData("district", e.target.value)} />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Açık Adres</Label>
                    <Input placeholder="Mahalle, sokak, kapı no..." value={data.address || ""} onChange={(e) => updateData("address", e.target.value)} />
                </div>
            </div>

            <div className="flex gap-4">
                <Button variant="outline" onClick={onBack} className="w-full">Geri</Button>
                <Button onClick={onNext} disabled={!isValid} className="w-full bg-orange-600 hover:bg-orange-700">Devam Et</Button>
            </div>
        </div>
    );
}

// 5. Agreements
export function StepAgreements({ data, updateData, onNext, onBack }: StepProps) {
    const isValid = data.kvkk && data.terms;

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Sözleşmeler</h3>
                <p className="text-slate-500 text-sm">Devam etmek için lütfen onaylayın.</p>
            </div>

            <div className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
                <div className="flex items-start gap-3">
                    <Checkbox id="kvkk" checked={data.kvkk} onCheckedChange={(c) => updateData("kvkk", c === true)} />
                    <Label htmlFor="kvkk" className="text-sm font-normal text-slate-700 leading-relaxed cursor-pointer">
                        <span className="font-bold text-slate-900 underline">KVKK Aydınlatma Metni</span>'ni okudum, anladım ve kişisel verilerimin işlenmesini onaylıyorum.
                    </Label>
                </div>
                <hr className="border-slate-200" />
                <div className="flex items-start gap-3">
                    <Checkbox id="terms" checked={data.terms} onCheckedChange={(c) => updateData("terms", c === true)} />
                    <Label htmlFor="terms" className="text-sm font-normal text-slate-700 leading-relaxed cursor-pointer">
                        <span className="font-bold text-slate-900 underline">Kullanıcı Sözleşmesi</span>'ni okudum ve kabul ediyorum.
                    </Label>
                </div>
                <hr className="border-slate-200" />
                <div className="flex items-start gap-3">
                    <Checkbox id="marketing" checked={data.marketing} onCheckedChange={(c) => updateData("marketing", c === true)} />
                    <Label htmlFor="marketing" className="text-sm font-normal text-slate-700 leading-relaxed cursor-pointer">
                        Kampanya ve duyurulardan haberdar olmak için ticari elektronik ileti gönderilmesine izin veriyorum. (İsteğe bağlı)
                    </Label>
                </div>
            </div>

            <div className="flex gap-4">
                <Button variant="outline" onClick={onBack} className="w-full">Geri</Button>
                <Button onClick={onNext} disabled={!isValid} className="w-full bg-orange-600 hover:bg-orange-700">Ödemeye Geç</Button>
            </div>
        </div>
    );
}

// 6. Payment
export function StepPayment({ onNext, onBack }: { onNext: () => void, onBack: () => void }) {
    const [loading, setLoading] = useState(false);

    const handlePay = () => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            onNext();
        }, 2000);
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Ödeme</h3>
                <p className="text-slate-500 text-sm">Kart bilgilerinizi güvenle girin (Simülasyon).</p>
            </div>

            <div className="space-y-4">
                <div className="relative">
                    <CreditCard className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                    <Input placeholder="Kart Numarası" className="pl-10 font-mono" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Input placeholder="AA/YY" className="font-mono text-center" />
                    <Input placeholder="CVC" className="font-mono text-center" maxLength={3} />
                </div>
                <Input placeholder="Kart Üzerindeki İsim" />
            </div>

            <Button onClick={handlePay} disabled={loading} className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-lg">
                {loading ? <><Loader2 className="animate-spin mr-2" /> İşleniyor...</> : "Ödemeyi Tamamla"}
            </Button>
            <Button variant="ghost" onClick={onBack} disabled={loading} className="w-full">Geri Dön</Button>
        </div>
    );
}

// 7. Success
export function StepSuccess() {
    return (
        <div className="text-center space-y-6 py-8">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto animate-in zoom-in duration-500">
                <Check className="w-10 h-10" />
            </div>

            <h2 className="text-3xl font-bold text-slate-900">Tebrikler! 🎉</h2>
            <p className="text-slate-500 max-w-sm mx-auto">
                Üyeliğiniz başarıyla oluşturuldu. Giriş bilgileri e-posta adresinize gönderildi.
            </p>

            <Link href="/login">
                <Button className="w-full h-12 text-lg bg-orange-600 hover:bg-orange-700 shadow-xl shadow-orange-500/20 mt-4">
                    Panele Git
                </Button>
            </Link>
        </div>
    );
}
