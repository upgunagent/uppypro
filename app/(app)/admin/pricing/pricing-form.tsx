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
    currentPrice: number; // in cents
    description: string;
}

export function PricingForm({ label, productKey, currentPrice, description }: PricingFormProps) {
    const [price, setPrice] = useState(currentPrice / 100);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleUpdate = async () => {
        setLoading(true);
        try {
            const res = await updatePricing(productKey, price);
            if (res.error) {
                toast({ variant: "destructive", title: "Hata", description: res.error });
            } else {
                toast({ title: "Başarılı", description: "Fiyat güncellendi." });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Hata", description: "Bir hata oluştu." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-6">
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <div className="p-2 bg-slate-100 rounded-lg">
                        <Tag className="w-5 h-5 text-slate-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{label}</h3>
                </div>
                <p className="text-sm text-slate-500 pl-11">{description}</p>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative w-40">
                    <Input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value))}
                        className="pr-8 font-mono text-right font-bold text-lg"
                    />
                    <span className="absolute right-3 top-2.5 text-slate-400 font-medium text-sm">TL</span>
                </div>
                <Button
                    onClick={handleUpdate}
                    disabled={loading}
                    className="bg-slate-900 hover:bg-slate-800"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Güncelle"}
                </Button>
            </div>
        </div>
    );
}
