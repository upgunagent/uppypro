"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updatePricing } from "@/app/actions/pricing";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Tag } from "lucide-react";

interface PricingFormProps {
    label: string;
    productKey: string;
    currentPrice: number; // in TL
    currentCode?: string;         // Iyzico Plan Ref Kodu (pricing tablosu)
    currentProductCode?: string;  // Iyzico Ürün Ref Kodu (products tablosu)
    description: string;
}

export function PricingForm({ label, productKey, currentPrice, currentCode = "", currentProductCode = "", description }: PricingFormProps) {
    const [price, setPrice] = useState(currentPrice);
    const [code, setCode] = useState(currentCode);
    const [productCode, setProductCode] = useState(currentProductCode);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleUpdate = async () => {
        setLoading(true);
        try {
            const res = await updatePricing(productKey, price, code, productCode);
            if (res.error) {
                toast({ variant: "destructive", title: "Hata", description: res.error });
            } else {
                toast({ title: "Başarılı", description: res.message || "Fiyat ve referans kodları güncellendi." });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Hata", description: "Bir hata oluştu." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            {/* Paket Başlığı */}
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-slate-100 rounded-lg">
                    <Tag className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900">{label}</h3>
                    <p className="text-sm text-slate-500">{description}</p>
                </div>
            </div>

            {/* Alanlar */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-end">
                {/* Ürün Ref Kodu */}
                <div className="flex flex-col gap-1 xl:col-span-1">
                    <label className="text-xs text-slate-500 font-medium">
                        Iyzico <span className="text-blue-600 font-semibold">Ürün</span> Ref Kodu
                    </label>
                    <Input
                        type="text"
                        value={productCode}
                        onChange={(e) => setProductCode(e.target.value)}
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        className="font-mono text-xs focus-visible:ring-blue-500"
                    />
                    <p className="text-xs text-slate-400">products tablosu → Iyzico ürün kodu</p>
                </div>

                {/* Plan Ref Kodu */}
                <div className="flex flex-col gap-1 xl:col-span-1">
                    <label className="text-xs text-slate-500 font-medium">
                        Iyzico <span className="text-orange-600 font-semibold">Plan</span> Ref Kodu
                    </label>
                    <Input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        className="font-mono text-xs focus-visible:ring-orange-500"
                    />
                    <p className="text-xs text-slate-400">pricing tablosu → Ödeme planı kodu</p>
                </div>

                {/* Aylık Tutar */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-500 font-medium whitespace-nowrap">Aylık Tutar (TL)</label>
                    <div className="relative">
                        <Input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(Number(e.target.value))}
                            className="pr-8 font-mono text-right font-bold focus-visible:ring-orange-500"
                        />
                        <span className="absolute right-3 top-2.5 text-slate-400 font-medium text-sm">₺</span>
                    </div>
                </div>

                {/* Güncelle Butonu */}
                <div>
                    <Button
                        onClick={handleUpdate}
                        disabled={loading}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-sm h-10"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Güncelle"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
