"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Loader2, CreditCard, Building2, User } from "lucide-react";
import { clsx } from "clsx";
import Link from "next/link";

// Types
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
    salesAgreement: boolean;
    preInfoForm: boolean;
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
    const [dynamicPlans, setDynamicPlans] = useState<Record<string, { name: string, price: number }>>({
        "base": { name: "UppyPro Inbox", price: 0 },
        "ai_starter": { name: "UppyPro AI", price: 0 },
        "ai_trendyol": { name: "UppyPro AI Trendyol", price: 0 },
        "ai_medium": { name: "UppyPro AI Orta", price: 0 },
        "ai_pro": { name: "UppyPro AI Profesyonel", price: 0 },
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // FETCH PRICES DIRECTLY FROM SUPABASE
                const { createClient } = await import("@/lib/supabase/client");
                const supabase = createClient();

                let prices = {
                    inbox: 895,
                    ai: 3995,
                    ai_trendyol: 4995,
                    ai_medium: 6995,
                    ai_pro: 9995
                };

                try {
                    const { data: priceData } = await supabase
                        .from('pricing')
                        .select('product_key, monthly_price_try')
                        .eq('billing_cycle', 'monthly');

                    if (priceData && priceData.length > 0) {
                        const priceMap = priceData.reduce((acc: any, item: any) => {
                            acc[item.product_key] = item.monthly_price_try;
                            return acc;
                        }, {});

                        prices = {
                            inbox: priceMap.uppypro_inbox || 895,
                            ai: priceMap.uppypro_ai || 3995,
                            ai_trendyol: priceMap.uppypro_ai_trendyol || 4995,
                            ai_medium: priceMap.uppypro_ai_medium || 6995,
                            ai_pro: priceMap.uppypro_ai_pro || 9995
                        };
                    }
                    console.log("[CLIENT] Prices from Supabase:", prices);
                } catch (error) {
                    console.error("[CLIENT] Failed to fetch prices from Supabase:", error);
                }

                setDynamicPlans({
                    "base": { name: "UppyPro Inbox", price: prices.inbox },
                    "ai_starter": { name: "UppyPro AI", price: prices.ai },
                    "ai_trendyol": { name: "UppyPro AI Trendyol", price: prices.ai_trendyol },
                    "ai_medium": { name: "UppyPro AI Orta", price: prices.ai_medium },
                    "ai_pro": { name: "UppyPro AI Profesyonel", price: prices.ai_pro },
                });
            } catch (e) {
                console.error("Pricing fetch error:", e);
                // Fallback
                setDynamicPlans({
                    "base": { name: "UppyPro Inbox", price: 895 },
                    "ai_starter": { name: "UppyPro AI", price: 3995 },
                    "ai_trendyol": { name: "UppyPro AI Trendyol", price: 4995 },
                    "ai_medium": { name: "UppyPro AI Orta", price: 6995 },
                    "ai_pro": { name: "UppyPro AI Profesyonel", price: 9995 },
                });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const selectedPlan = dynamicPlans[data.plan] || dynamicPlans["base"];
    const kdv = selectedPlan.price * 0.20;
    const total = selectedPlan.price + kdv;

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                <span className="ml-3 text-slate-600">Fiyatlar güncelleniyor...</span>
            </div>
        );
    }

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
                    <div className="font-bold text-lg">
                        {selectedPlan.price.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL
                    </div>
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
                        placeholder="(5XX) XXX XX XX"
                        value={data.phone}
                        onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, '');
                            if (val.startsWith('0')) val = val.substring(1);
                            if (val.startsWith('90')) val = val.substring(2);

                            // Limit to 10 digits
                            val = val.substring(0, 10);

                            // Format
                            let formatted = val;
                            if (val.length > 0) formatted = `(${val.substring(0, 3)}`;
                            if (val.length > 3) formatted += `) ${val.substring(3, 6)}`;
                            if (val.length > 6) formatted += ` ${val.substring(6, 8)}`;
                            if (val.length > 8) formatted += ` ${val.substring(8, 10)}`;

                            updateData("phone", formatted);
                        }}
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { TURKEY_LOCATIONS } from "@/lib/locations";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { KvkkContent, DistanceSalesAgreement, PreliminaryInformationForm, AgreementData } from "./legal-contents";

export function StepBillingDetails({ data, updateData, onNext, onBack }: StepProps) {
    const isCorporate = data.billingType === "corporate";
    const isValid = data.address && data.city && data.district && (isCorporate ? (data.companyName && data.taxOffice && data.taxNumber) : (data.tcKn && data.fullName));

    // State for combobox open status
    const [openCity, setOpenCity] = useState(false);
    const [openDistrict, setOpenDistrict] = useState(false);

    // Get districts for selected city
    const districts = data.city ? TURKEY_LOCATIONS.find(l => l.city === data.city)?.districts || [] : [];

    const handleCitySelect = (currentValue: string) => {
        updateData("city", currentValue === data.city ? "" : currentValue);
        updateData("district", ""); // Reset district when city changes
        setOpenCity(false);
    };

    const handleDistrictSelect = (currentValue: string) => {
        updateData("district", currentValue === data.district ? "" : currentValue);
        setOpenDistrict(false);
    }

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
                        <select
                            value={data.city}
                            onChange={(e) => {
                                updateData("city", e.target.value);
                                updateData("district", "");
                            }}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="">İl Seçiniz...</option>
                            {TURKEY_LOCATIONS.map((l) => (
                                <option key={l.city} value={l.city}>{l.city}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label>İlçe</Label>
                        <select
                            value={data.district}
                            onChange={(e) => updateData("district", e.target.value)}
                            disabled={!data.city}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="">İlçe Seçiniz...</option>
                            {districts.map((d) => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
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
    const isValid = data.kvkk && data.salesAgreement && data.preInfoForm;
    const [showKvkk, setShowKvkk] = useState(false);
    const [showSalesAgreement, setShowSalesAgreement] = useState(false);
    const [showPreInfo, setShowPreInfo] = useState(false);

    // Prepare dynamic data
    const [dynamicPlans, setDynamicPlans] = useState<Record<string, { name: string, price: number }>>({
        "base": { name: "UppyPro Inbox", price: 0 },
        "ai_starter": { name: "UppyPro AI", price: 0 },
        "ai_trendyol": { name: "UppyPro AI Trendyol", price: 0 },
        "ai_medium": { name: "UppyPro AI Orta", price: 0 },
        "ai_pro": { name: "UppyPro AI Profesyonel", price: 0 },
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // FETCH PRICES DIRECTLY FROM SUPABASE
                const { createClient } = await import("@/lib/supabase/client");
                const supabase = createClient();

                let prices = {
                    inbox: 895,
                    ai: 3995,
                    ai_trendyol: 4995,
                    ai_medium: 6995,
                    ai_pro: 9995
                };

                try {
                    const { data: priceData } = await supabase
                        .from('pricing')
                        .select('product_key, monthly_price_try')
                        .eq('billing_cycle', 'monthly');

                    if (priceData && priceData.length > 0) {
                        const priceMap = priceData.reduce((acc: any, item: any) => {
                            acc[item.product_key] = item.monthly_price_try;
                            return acc;
                        }, {});

                        prices = {
                            inbox: priceMap.uppypro_inbox || 895,
                            ai: priceMap.uppypro_ai || 3995,
                            ai_trendyol: priceMap.uppypro_ai_trendyol || 4995,
                            ai_medium: priceMap.uppypro_ai_medium || 6995,
                            ai_pro: priceMap.uppypro_ai_pro || 9995
                        };
                    }
                } catch (error) {
                    console.error("[CLIENT-AGREEMENTS] Failed to fetch prices from Supabase:", error);
                }

                setDynamicPlans({
                    "base": { name: "UppyPro Inbox", price: prices.inbox },
                    "ai_starter": { name: "UppyPro AI", price: prices.ai },
                    "ai_trendyol": { name: "UppyPro AI Trendyol", price: prices.ai_trendyol },
                    "ai_medium": { name: "UppyPro AI Orta", price: prices.ai_medium },
                    "ai_pro": { name: "UppyPro AI Profesyonel", price: prices.ai_pro },
                });
            } catch (e) {
                console.error("Pricing fetch error:", e);
                // Fallback
                setDynamicPlans({
                    "base": { name: "UppyPro Inbox", price: 895 },
                    "ai_starter": { name: "UppyPro AI", price: 3995 },
                    "ai_trendyol": { name: "UppyPro AI Trendyol", price: 4995 },
                    "ai_medium": { name: "UppyPro AI Orta", price: 6995 },
                    "ai_pro": { name: "UppyPro AI Profesyonel", price: 9995 },
                });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const selectedPlan = dynamicPlans[data.plan] || dynamicPlans["base"];
    const kdv = selectedPlan.price * 0.20;
    const total = selectedPlan.price + kdv;

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                <span className="ml-3 text-slate-600">Güncel kurlar alınıyor...</span>
            </div>
        );
    }

    const agreementData: AgreementData = {
        buyer: {
            name: data.billingType === 'corporate' ? data.companyName || data.fullName : data.fullName,
            email: data.email,
            phone: data.phone,
            address: data.address,
            city: data.city,
            district: data.district,
            ...(data.billingType === 'corporate' ? {
                taxOffice: data.taxOffice,
                taxNumber: data.taxNumber
            } : {
                tckn: data.tcKn
            })
        },
        plan: {
            name: selectedPlan.name,
            price: selectedPlan.price,
            total: total
        },
        date: new Date().toLocaleDateString('tr-TR')
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Sözleşmeler</h3>
                <p className="text-slate-500 text-sm">Devam etmek için lütfen onaylayın.</p>
            </div>

            <div className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
                {/* KVKK */}
                <div className="flex items-start gap-3">
                    <Checkbox id="kvkk" checked={data.kvkk} onCheckedChange={(c) => updateData("kvkk", c === true)} />
                    <Label htmlFor="kvkk" className="text-sm font-normal text-slate-700 leading-relaxed cursor-pointer">
                        <span
                            className="font-bold text-slate-900 underline hover:text-orange-600 transition-colors"
                            onClick={(e) => {
                                e.preventDefault();
                                setShowKvkk(true);
                            }}
                        >
                            KVKK Aydınlatma Metni
                        </span>'ni okudum, anladım ve kişisel verilerimin işlenmesini onaylıyorum.
                    </Label>
                </div>
                <hr className="border-slate-200" />

                {/* Ön Bilgilendirme Formu */}
                <div className="flex items-start gap-3">
                    <Checkbox id="preInfo" checked={data.preInfoForm} onCheckedChange={(c) => updateData("preInfoForm", c === true)} />
                    <Label htmlFor="preInfo" className="text-sm font-normal text-slate-700 leading-relaxed cursor-pointer">
                        <span
                            className="font-bold text-slate-900 underline hover:text-orange-600 transition-colors"
                            onClick={(e) => {
                                e.preventDefault();
                                setShowPreInfo(true);
                            }}
                        >
                            Ön Bilgilendirme Formu
                        </span>'nu okudum ve kabul ediyorum.
                    </Label>
                </div>
                <hr className="border-slate-200" />

                {/* Mesafeli Satış Sözleşmesi */}
                <div className="flex items-start gap-3">
                    <Checkbox id="salesAgreement" checked={data.salesAgreement} onCheckedChange={(c) => updateData("salesAgreement", c === true)} />
                    <Label htmlFor="salesAgreement" className="text-sm font-normal text-slate-700 leading-relaxed cursor-pointer">
                        <span
                            className="font-bold text-slate-900 underline hover:text-orange-600 transition-colors"
                            onClick={(e) => {
                                e.preventDefault();
                                setShowSalesAgreement(true);
                            }}
                        >
                            Mesafeli Satış Sözleşmesi
                        </span>'ni okudum ve kabul ediyorum.
                    </Label>
                </div>
                <hr className="border-slate-200" />

                {/* Pazarlama */}
                <div className="flex items-start gap-3">
                    <Checkbox id="marketing" checked={data.marketing} onCheckedChange={(c) => updateData("marketing", c === true)} />
                    <Label htmlFor="marketing" className="text-sm font-normal text-slate-700 leading-relaxed cursor-pointer">
                        Kampanya ve duyurulardan haberdar olmak için ticari elektronik ileti gönderilmesine izin veriyorum. (İsteğe bağlı)
                    </Label>
                </div>
            </div>

            {/* KVKK Modal */}
            <Dialog open={showKvkk} onOpenChange={setShowKvkk}>
                <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>KVKK Aydınlatma Metni</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto pr-2">
                        <KvkkContent />
                    </div>
                    <DialogFooter className="pt-4 border-t border-slate-100">
                        <Button variant="outline" onClick={() => setShowKvkk(false)}>Kapat</Button>
                        <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => { updateData("kvkk", true); setShowKvkk(false); }}>Okudum, Anladım</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Ön Bilgilendirme Formu Modal */}
            <Dialog open={showPreInfo} onOpenChange={setShowPreInfo}>
                <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Ön Bilgilendirme Formu</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto pr-2">
                        <PreliminaryInformationForm data={agreementData} />
                    </div>
                    <DialogFooter className="pt-4 border-t border-slate-100">
                        <Button variant="outline" onClick={() => setShowPreInfo(false)}>Kapat</Button>
                        <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => { updateData("preInfoForm", true); setShowPreInfo(false); }}>Okudum, Kabul Ediyorum</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Mesafeli Satış Sözleşmesi Modal */}
            <Dialog open={showSalesAgreement} onOpenChange={setShowSalesAgreement}>
                <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Mesafeli Satış Sözleşmesi</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto pr-2">
                        <DistanceSalesAgreement data={agreementData} />
                    </div>
                    <DialogFooter className="pt-4 border-t border-slate-100">
                        <Button variant="outline" onClick={() => setShowSalesAgreement(false)}>Kapat</Button>
                        <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => { updateData("salesAgreement", true); setShowSalesAgreement(false); }}>Okudum, Kabul Ediyorum</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="flex gap-4">
                <Button variant="outline" onClick={onBack} className="w-full">Geri</Button>
                <Button onClick={onNext} disabled={!isValid} className="w-full bg-orange-600 hover:bg-orange-700">Ödemeye Geç</Button>
            </div>
        </div>
    );
}

// 6. Payment
// 6. Payment
import { completeSignupWithInvite } from "@/app/actions/signup";
import { useToast } from "@/components/ui/use-toast";
import Script from "next/script";

export function StepPayment({ data, onNext, onBack }: { data: WizardData, onNext: () => void, onBack: () => void }) {
    const [loading, setLoading] = useState(false);
    const [formLoaded, setFormLoaded] = useState(false);
    const { toast } = useToast();
    const checkoutFormRef = useRef<HTMLDivElement>(null);

    const handleStartPayment = async () => {
        setLoading(true);

        try {
            const result = await completeSignupWithInvite(data);

            if (result.error) {
                toast({
                    variant: "destructive",
                    title: "Hata",
                    description: result.error
                });
                setLoading(false);
            } else if (result.checkoutFormContent) {
                // Inject logic
                setTimeout(() => {
                    if (checkoutFormRef.current) {
                        checkoutFormRef.current.innerHTML = result.checkoutFormContent!;
                        const scripts = checkoutFormRef.current.querySelectorAll("script");
                        scripts.forEach((oldScript: HTMLScriptElement) => {
                            const newScript = document.createElement("script");
                            Array.from(oldScript.attributes).forEach((attr: Attr) => newScript.setAttribute(attr.name, attr.value));
                            newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                            oldScript.parentNode?.replaceChild(newScript, oldScript);
                        });
                        setFormLoaded(true);
                    }
                }, 100);
            } else {
                // Unexpected response - no error, no form
                toast({
                    variant: "destructive",
                    title: "Hata",
                    description: "Ödeme formu yüklenemedi. Lütfen tekrar deneyin."
                });
                setLoading(false);
            }
        } catch (e) {
            toast({
                variant: "destructive",
                title: "Hata",
                description: "Bir hata oluştu."
            });
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Güvenli Ödeme</h3>
                <p className="text-slate-500 text-sm">
                    Kredi kartı bilgileriniz Iyzico güvencesiyle kaydedilecektir. Deneme süresi boyunca ödeme alınmaz.
                </p>
            </div>

            <div className="space-y-4">
                {!loading && (
                    <>
                        <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
                            <User className="w-5 h-5 text-blue-600 mt-0.5" />
                            <div className="text-sm text-blue-800">
                                <strong>{data.fullName}</strong> ({data.email}) adına hesap oluşturulacak ve ödeme formu yüklenecektir.
                            </div>
                        </div>

                        {/* Trial Period Info Banner */}
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                            <div className="flex items-start gap-3">
                                <span className="text-2xl mt-0.5">🎁</span>
                                <div className="space-y-2">
                                    <p className="font-bold text-emerald-800 text-sm">7 Günlük Ücretsiz Deneme Süresi</p>
                                    <ul className="space-y-1.5 text-xs text-emerald-700">
                                        <li className="flex items-start gap-2">
                                            <span className="text-emerald-500 mt-0.5">✓</span>
                                            <span>Kredi kartı bilgileriniz güvenle kaydedilecek, <strong>şu an herhangi bir ücret çekilmeyecektir.</strong></span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-emerald-500 mt-0.5">✓</span>
                                            <span>7 gün boyunca tüm özellikleri <strong>ücretsiz</strong> kullanabilirsiniz.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-orange-500 mt-0.5">⚠</span>
                                            <span>7 günlük deneme süresi sonunda aboneliğinizi iptal etmediğiniz takdirde, <strong>abonelik ücreti kartınızdan otomatik olarak tahsil edilecektir.</strong></span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <Button onClick={handleStartPayment} disabled={loading} className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-lg shadow-lg">
                            Deneme Süresini Başlat
                        </Button>
                        <div className="flex justify-center mt-4">
                            <img src="/images/iyzico-ile-ode.png" alt="Iyzico ile Öde" className="h-8" />
                        </div>
                        <Button variant="ghost" onClick={onBack} disabled={loading} className="w-full">Geri Dön</Button>
                    </>
                )}

                {loading && !formLoaded && (
                    <div className="w-full min-h-[200px] flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
                    </div>
                )}
                <div id="iyzipay-checkout-form" className="responsive w-full" ref={checkoutFormRef}></div>
            </div>
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
                Üyeliğiniz başarıyla oluşturuldu. Şifrenizi belirlemeniz için gereken bağlantı e-posta adresinize gönderildi.
            </p>
            <p className="text-sm text-slate-400">
                Lütfen gelen kutunuzu kontrol edin ve gönderilen bağlantıya tıklayarak şifrenizi oluşturun.
            </p>

            <Link href="/login">
                <Button className="w-full h-12 text-lg bg-orange-600 hover:bg-orange-700 shadow-xl shadow-orange-500/20 mt-4">
                    Panele Git
                </Button>
            </Link>
        </div>
    );
}
