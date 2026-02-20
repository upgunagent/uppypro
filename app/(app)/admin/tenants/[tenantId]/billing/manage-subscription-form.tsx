"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { updateSubscription } from "../../../actions"; // Adjusted path import
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Subscription {
    base_product_key?: string;
    ai_product_key?: string;
    custom_price_try?: number;
    custom_price_usd?: number;
}

export function ManageSubscriptionForm({ tenantId, subscription, pricing }: {
    tenantId: string,
    subscription: any,
    pricing: {
        inbox: number,
        ai: number,
        corporate_small: number,
        corporate_medium: number,
        corporate_large: number,
        corporate_xl: number
    }
}) {
    // Determine current selection
    let initialPlan = 'inbox';
    if (subscription?.ai_product_key === 'uppypro_ai') initialPlan = 'ai';
    else if (subscription?.ai_product_key === 'uppypro_corporate_small') initialPlan = 'corporate_small';
    else if (subscription?.ai_product_key === 'uppypro_corporate_medium') initialPlan = 'corporate_medium';
    else if (subscription?.ai_product_key === 'uppypro_corporate_large') initialPlan = 'corporate_large';
    else if (subscription?.ai_product_key === 'uppypro_corporate_xl') initialPlan = 'corporate_xl';

    const [plan, setPlan] = useState(initialPlan);
    const [price, setPrice] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        const res = await updateSubscription(formData);

        if (res?.error) {
            alert(res.error);
        } else {
            router.refresh();
        }
        setLoading(false);
    }

    const formatPrice = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(amount);
    };

    return (
        <form action={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div>
                <h3 className="text-lg font-bold text-slate-900">Abonelik Yönetimi</h3>
                <p className="text-sm text-slate-500">Paket değişikliği ve özel fiyatlandırma.</p>
            </div>

            <input type="hidden" name="tenantId" value={tenantId} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Standard Plans */}
                <PlanOption
                    id="inbox"
                    title="UppyPro Inbox"
                    price={formatPrice(pricing.inbox)}
                    selected={plan === 'inbox'}
                    onSelect={() => setPlan('inbox')}
                />

                <PlanOption
                    id="ai"
                    title="UppyPro AI"
                    price={formatPrice(pricing.ai)}
                    selected={plan === 'ai'}
                    onSelect={() => setPlan('ai')}
                />

                {/* Corporate Plans */}
                <div className="col-span-1 md:col-span-2 border-t my-2 pt-4">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Kurumsal Paketler</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <PlanOption
                            id="corporate_small"
                            title="Kurumsal Small"
                            price={formatPrice(pricing.corporate_small)}
                            selected={plan === 'corporate_small'}
                            onSelect={() => setPlan('corporate_small')}
                        />
                        <PlanOption
                            id="corporate_medium"
                            title="Kurumsal Medium"
                            price={formatPrice(pricing.corporate_medium)}
                            selected={plan === 'corporate_medium'}
                            onSelect={() => setPlan('corporate_medium')}
                        />
                        <PlanOption
                            id="corporate_large"
                            title="Kurumsal Large"
                            price={formatPrice(pricing.corporate_large)}
                            selected={plan === 'corporate_large'}
                            onSelect={() => setPlan('corporate_large')}
                        />
                        <PlanOption
                            id="corporate_xl"
                            title="Kurumsal XL"
                            price={formatPrice(pricing.corporate_xl)}
                            selected={plan === 'corporate_xl'}
                            onSelect={() => setPlan('corporate_xl')}
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Değişiklikleri Kaydet
                </Button>
            </div>
        </form>
    );
}

function PlanOption({ id, title, price, selected, onSelect, fullWidth }: { id: string, title: string, price: string, selected: boolean, onSelect: () => void, fullWidth?: boolean }) {
    return (
        <label className={`cursor-pointer border rounded-xl p-4 flex items-center justify-between transition-all ${selected ? 'border-primary ring-2 ring-primary/10 bg-primary/5' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'} ${fullWidth ? 'w-full' : ''}`}>
            <div className="flex items-center gap-3">
                <input type="radio" name="planType" value={id} className="w-4 h-4 text-primary border-slate-300 focus:ring-primary" checked={selected} onChange={onSelect} />
                <div className="flex flex-col">
                    <span className="font-semibold text-slate-900 text-sm">{title}</span>
                    <span className="text-xs text-slate-500 font-medium">{price}</span>
                </div>
            </div>
            {selected && <Check className="w-4 h-4 text-primary" />}
        </label>
    );
}
