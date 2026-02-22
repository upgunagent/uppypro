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
    currentCode?: string;
    description: string;
}

export function PricingForm({ label, productKey, currentPrice, currentCode = "", description }: PricingFormProps) {
    const [price, setPrice] = useState(currentPrice); // Direct TL value
    const [code, setCode] = useState(currentCode);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleUpdate = async () => {
        setLoading(true);
        try {
            const res = await updatePricing(productKey, price, code);
            if (res.error) {
                toast({ variant: "destructive", title: "Hata", description: res.error });
            } else {
                toast({ title: "Başarılı", description: "Fiyat ve plan referansı güncellendi." });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Hata", description: "Bir hata oluştu." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1 w-full">
                <div className="flex items-center gap-2 mb-1">
                    <div className="p-2 bg-slate-100 rounded-lg">
                        <Tag className="w-5 h-5 text-slate-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{label}</h3>
                </div>
                <p className="text-sm text-slate-500 pl-11 mb-2 md:mb-0">{description}</p>
            </div>

            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full md:w-auto">
                <div className="flex flex-col gap-1 w-full sm:w-64">
                    <label className="text-xs text-slate-500 font-medium">İyzico Plan Referans Kodu (İsteğe Bağlı)</label>
                    <Input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Örn: a12a8c6c-..."
                        className="font-mono text-sm focus-visible:ring-orange-500"
                    />
                </div>

                <div className="flex items-end gap-4 w-full sm:w-auto">
                    <div className="flex flex-col gap-1 w-full sm:w-32">
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

                    <Button
                        onClick={handleUpdate}
                        disabled={loading}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-sm w-full sm:w-auto h-10"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Güncelle"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
