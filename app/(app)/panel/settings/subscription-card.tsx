"use client";

import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, Package, Tag } from "lucide-react";
import { getPackageName } from "@/lib/subscription-utils";

export function SubscriptionCard({ subscription, price, customPrice }: { subscription: any, price: any, customPrice?: number }) {
    if (!subscription) {
        return (
            <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center">
                <p className="text-slate-500">Aktif abonelik bulunamadı.</p>
            </div>
        );
    }

    const { status, billing_cycle, current_period_end } = subscription;
    const packageName = getPackageName(subscription);

    // Format price: 249900 -> 2.499,00 TL
    const finalPrice = customPrice
        ? customPrice / 100
        : (price ? price.monthly_price_try / 100 : 0);

    const formattedPrice = finalPrice > 0
        ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(finalPrice)
        : '-';

    return (
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-lg">
                    <Package className="text-orange-600 w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-slate-900">Mevcut Abonelik</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                    <p className="text-sm text-slate-500">Paket</p>
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-slate-900">{packageName}</span>
                        <Badge variant={status === 'active' ? 'default' : 'destructive'} className={status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}>
                            {status === 'active' ? 'Aktif' : status}
                        </Badge>
                    </div>
                </div>

                <div className="space-y-1">
                    <p className="text-sm text-slate-500">Ödeme Dönemi</p>
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-slate-900">
                            {billing_cycle === 'monthly' ? 'Aylık' : 'Yıllık'}
                        </span>
                    </div>
                </div>

                <div className="space-y-1">
                    <p className="text-sm text-slate-500">Aylık Ücret</p>
                    <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-slate-900">
                            {formattedPrice}
                        </span>
                    </div>
                </div>

                <div className="space-y-1">
                    <p className="text-sm text-slate-500">Sonraki Ödeme</p>
                    <span className="font-medium text-slate-900">
                        {current_period_end ? new Date(current_period_end).toLocaleDateString('tr-TR') : '-'}
                    </span>
                </div>
            </div>
        </div>
    );
}
