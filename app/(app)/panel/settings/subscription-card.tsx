"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, Package, Tag, AlertTriangle, CheckCircle } from "lucide-react";
import { getPackageName } from "@/lib/subscription-utils";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cancelSubscription, undoCancelSubscription } from "@/app/actions/subscription";
import { useRouter } from "next/navigation";

export function SubscriptionCard({
    subscription,
    price,
    customPriceTry,
    customPriceUsd,
    priceUsd,
    usdRate = 1
}: {
    subscription: any,
    price: any,
    customPriceTry?: number,
    customPriceUsd?: number,
    priceUsd?: number,
    usdRate?: number
}) {
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState<string>("");
    const [cancelDetails, setCancelDetails] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    if (!subscription) {
        return (
            <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center">
                <p className="text-slate-500">Aktif abonelik bulunamadı.</p>
            </div>
        );
    }

    const { status, billing_cycle, current_period_end, cancel_at_period_end } = subscription;
    const packageName = getPackageName(subscription);

    // Format price: Prioritize USD
    let formattedPrice = '-';

    if (customPriceUsd) {
        formattedPrice = `$${customPriceUsd} (≈ ${(customPriceUsd * usdRate).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL)`;
    } else if (customPriceTry) {
        // Legacy TRY
        formattedPrice = `${(customPriceTry / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`;
    } else if (priceUsd) {
        // Standard Plan USD
        formattedPrice = `$${priceUsd} (≈ ${(priceUsd * usdRate).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL)`;
    } else if (price?.monthly_price_try) {
        // Fallback or Legacy Standard
        formattedPrice = `${(price.monthly_price_try / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`;
    }

    const formattedEndDate = current_period_end ? new Date(current_period_end).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';

    const handleCancel = async () => {
        if (!cancelReason) return;
        setIsLoading(true);
        try {
            const result = await cancelSubscription(cancelReason, cancelDetails);
            if (result.error) {
                alert(result.error);
                return;
            }
            setIsCancelModalOpen(false);
            router.refresh();
        } catch (error) {
            console.error(error);
            alert("Beklenmeyen bir hata oluştu.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUndoCancel = async () => {
        setIsLoading(true);
        try {
            const result = await undoCancelSubscription();
            if (result.error) {
                alert(result.error);
                return;
            }
            router.refresh();
        } catch (error) {
            console.error(error);
            alert("Beklenmeyen bir hata oluştu.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-50 rounded-lg">
                        <Package className="text-orange-600 w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-900">Mevcut Abonelik</h3>
                </div>
                {cancel_at_period_end && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200 gap-1.5 px-3 py-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        İptal Planlandı: {formattedEndDate}
                    </Badge>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                    <p className="text-sm text-slate-500">Paket</p>
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-slate-900">{packageName}</span>
                        {!cancel_at_period_end && (
                            <Badge variant={status === 'active' ? 'default' : 'destructive'} className={status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}>
                                {status === 'active' ? 'Aktif' : status}
                            </Badge>
                        )}
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
                    <p className="text-sm text-slate-500">{cancel_at_period_end ? 'Erişim Bitiş Tarihi' : 'Sonraki Ödeme'}</p>
                    <span className="font-medium text-slate-900">
                        {formattedEndDate}
                    </span>
                </div>
            </div>

            {/* Actions for Active Subscription */}
            {status === 'active' && !cancel_at_period_end && (
                <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                Aboneliği İptal Et
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Aboneliği İptal Et</DialogTitle>
                                <DialogDescription>
                                    Aboneliğinizi iptal etmek istediğinize emin misiniz? Lütfen nedenini bizimle paylaşın.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">İptal Sebebiniz</label>
                                    <Select value={cancelReason} onValueChange={setCancelReason}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Bir sebep seçin..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PRICE">Fiyat yüksek</SelectItem>
                                            <SelectItem value="NOT_USING">Kullanmıyorum / İhtiyacım kalmadı</SelectItem>
                                            <SelectItem value="MISSING_FEATURE">Aradığım özellik yok</SelectItem>
                                            <SelectItem value="TECH_ISSUE">Teknik sorun yaşadım</SelectItem>
                                            <SelectItem value="OTHER">Diğer</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {cancelReason === 'OTHER' && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Detaylar (Opsiyonel)</label>
                                        <Textarea
                                            placeholder="Bize daha fazla bilgi verebilirsiniz..."
                                            value={cancelDetails}
                                            onChange={(e) => setCancelDetails(e.target.value)}
                                        />
                                    </div>
                                )}
                                <div className="bg-orange-50 p-3 rounded-md border border-orange-100 text-sm text-orange-800">
                                    <strong>Bilgi:</strong> İptal etseniz bile, mevcut dönem sonuna kadar ({formattedEndDate}) sistemimizi kullanmaya devam edebilirsiniz. Bu tarihten sonra aboneliğiniz yenilenmeyecektir.
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCancelModalOpen(false)}>Vazgeç</Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleCancel}
                                    disabled={!cancelReason || isLoading}
                                >
                                    {isLoading ? 'İşleniyor...' : 'İptali Onayla'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            )}

            {/* Actions for Scheduled Cancellation */}
            {cancel_at_period_end && (
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-slate-500">
                        Aboneliğiniz <strong>{formattedEndDate}</strong> tarihinde sona erecektir. Fikrinizi değiştirirseniz iptali geri alabilirsiniz.
                    </p>
                    <Button variant="outline" className="border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800" onClick={handleUndoCancel} disabled={isLoading}>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {isLoading ? 'İşleniyor...' : 'İptali Geri Al ve Devam Et'}
                    </Button>
                </div>
            )}
        </div>
    );
}
