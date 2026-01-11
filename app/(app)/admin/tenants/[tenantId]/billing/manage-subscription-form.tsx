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
}

interface ManageSubscriptionFormProps {
    tenantId: string;
    subscription: Subscription | null;
    inboxPrice: number;
    aiPrice: number;
}

export function ManageSubscriptionForm({ tenantId, subscription, inboxPrice, aiPrice }: ManageSubscriptionFormProps) {
    // Determine current selection
    // simple logic: if enterprise key present -> enterprise
    // else if ai key present -> ai
    // else -> inbox

    let initialPlan = 'inbox';
    if (subscription?.ai_product_key === 'uppypro_enterprise') initialPlan = 'enterprise';
    else if (subscription?.ai_product_key === 'uppypro_ai') initialPlan = 'ai';

    const [plan, setPlan] = useState(initialPlan);
    const [price, setPrice] = useState(subscription?.custom_price_try ? (subscription.custom_price_try / 100).toString() : "");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        // Append extra logic if needed, but actions can handle raw formData
        // Manually adding state values if they aren't controlled inputs in form (they are, but state ensures visuals)

        const res = await updateSubscription(formData);

        if (res?.error) {
            alert(res.error);
        } else {
            // Success feedback
            router.refresh();
        }
        setLoading(false);
    }

    return (
        <form action={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div>
                <h3 className="text-lg font-bold text-slate-900">Abonelik Yönetimi</h3>
                <p className="text-sm text-slate-500">Paket değişikliği ve özel fiyatlandırma.</p>
            </div>

            <input type="hidden" name="tenantId" value={tenantId} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Plan Selection Cards */}
                <label className={`cursor-pointer border rounded-xl p-4 flex flex-col gap-2 transition-all ${plan === 'inbox' ? 'border-primary ring-2 ring-primary/10 bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}>
                    <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900">UppyPro Inbox</span>
                        <input type="radio" name="planType" value="inbox" className="sr-only" checked={plan === 'inbox'} onChange={() => setPlan('inbox')} />
                        {plan === 'inbox' && <Check className="w-4 h-4 text-primary" />}
                    </div>
                    <span className="text-sm text-slate-500">{new Intl.NumberFormat('tr-TR').format(inboxPrice / 100)} TL/ay</span>
                </label>

                <label className={`cursor-pointer border rounded-xl p-4 flex flex-col gap-2 transition-all ${plan === 'ai' ? 'border-primary ring-2 ring-primary/10 bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}>
                    <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900">UppyPro AI</span>
                        <input type="radio" name="planType" value="ai" className="sr-only" checked={plan === 'ai'} onChange={() => setPlan('ai')} />
                        {plan === 'ai' && <Check className="w-4 h-4 text-primary" />}
                    </div>
                    <span className="text-sm text-slate-500">{new Intl.NumberFormat('tr-TR').format(aiPrice / 100)} TL/ay</span>
                </label>

                <label className={`cursor-pointer border rounded-xl p-4 flex flex-col gap-2 transition-all ${plan === 'enterprise' ? 'border-primary ring-2 ring-primary/10 bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}>
                    <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900">UppyPro Kurumsal</span>
                        <input type="radio" name="planType" value="enterprise" className="sr-only" checked={plan === 'enterprise'} onChange={() => setPlan('enterprise')} />
                        {plan === 'enterprise' && <Check className="w-4 h-4 text-primary" />}
                    </div>
                    <span className="text-sm text-slate-500">Özel Teklif</span>
                </label>
            </div>

            {/* Custom Price Input for Enterprise */}
            {plan === 'enterprise' && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Özel Aylık Ücret (TL)</label>
                    <div className="relative">
                        <Input
                            type="number"
                            name="customPrice"
                            placeholder="Örn: 5000"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            required={plan === 'enterprise'}
                        />
                        <span className="absolute right-3 top-2.5 text-slate-400 text-sm">TL</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Bu fiyat sadece bu işletme için geçerli olacaktır.</p>
                </div>
            )}

            <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Değişiklikleri Kaydet
                </Button>
            </div>
        </form>
    );
}
