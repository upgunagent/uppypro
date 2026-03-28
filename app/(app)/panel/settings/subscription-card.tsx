"use client";

import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Calendar, Package, Tag, AlertTriangle, RefreshCw, ArrowLeftRight, RotateCcw, X, ArrowUp, ArrowDown, Building2, Mail, Check, Clock, Info } from "lucide-react";
import { getPackageName, isPlanUpgrade, isPlanDowngrade, PLAN_FEATURES, SELF_SERVICE_PLANS } from "@/lib/subscription-utils";
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
import { cancelUserSubscription, retryUserPayment, upgradeUserPlan, downgradeUserPlan, cancelPendingDowngrade, changeUserPlan, reactivateUserSubscription } from "@/app/actions/subscription";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

export function SubscriptionCard({
    subscription,
    price,
    allPrices = [],
    customPriceTry,
    customPriceUsd,
    priceUsd,
    usdRate = 1
}: {
    subscription: any,
    price: any,
    allPrices?: any[],
    customPriceTry?: number,
    customPriceUsd?: number,
    priceUsd?: number,
    usdRate?: number
}) {
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [isPlanChangeModalOpen, setIsPlanChangeModalOpen] = useState(false);
    const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);

    const [cancelReason, setCancelReason] = useState<string>("");
    const [cancelDetails, setCancelDetails] = useState<string>("");

    const [selectedChangePlan, setSelectedChangePlan] = useState<string>("");
    const [selectedReactivatePlan, setSelectedReactivatePlan] = useState<string>("");
    const [checkoutFormContent, setCheckoutFormContent] = useState<string>("");
    // Dialog dışında, sayfada gösterilecek checkout formu
    const [showCheckoutInPage, setShowCheckoutInPage] = useState(false);

    const [isLoading, setIsLoading] = useState(false);

    const checkoutRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const { toast } = useToast();

    // Iyzico'nun DOM'a eklediği tüm kalıntıları temizle
    const cleanupIyzicoDOM = () => {
        // Container'ı temizle
        if (checkoutRef.current) {
            checkoutRef.current.innerHTML = '';
        }
        // Iyzico'nun body/document'a eklediği iframe, modal ve overlay'leri kaldır
        const selectors = [
            'iframe[src*="iyzico"]',
            'iframe[src*="iyzipay"]',
            'iframe[id*="iyzipay"]',
            'iframe[id*="iyzico"]',
            '[id*="iyzipay"]',
            '[class*="iyzipay"]',
            '[id*="iyzico-modal"]',
            '[class*="iyzico-overlay"]',
        ];
        document.querySelectorAll(selectors.join(', ')).forEach(el => el.remove());
        // body overflow lock'u kaldır (modal açıkken body'ye eklenir)
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    };

    // Iyzico checkout formunu Dialog kapatıldıktan SONRA sayfaya inject et
    useEffect(() => {
        if (!showCheckoutInPage || !checkoutFormContent) return;

        // Kısa gecikme: Dialog kapanmasını bekle, sonra script'leri ekle
        const timer = setTimeout(() => {
            if (!checkoutRef.current) return;
            checkoutRef.current.innerHTML = '';

            const div = document.createElement('div');
            div.innerHTML = checkoutFormContent;

            // Script'leri yeniden çalıştır
            const scripts = div.querySelectorAll('script');
            scripts.forEach(script => {
                const newScript = document.createElement('script');
                if (script.src) {
                    newScript.src = script.src;
                    newScript.async = true;
                } else {
                    newScript.textContent = script.textContent;
                }
                document.head.appendChild(newScript);
                script.remove();
            });

            checkoutRef.current.appendChild(div);
        }, 300);

        return () => clearTimeout(timer);
    }, [showCheckoutInPage, checkoutFormContent]);

    // Component unmount olduğunda Iyzico kalıntılarını temizle
    useEffect(() => {
        return () => {
            cleanupIyzicoDOM();
        };
    }, []);

    if (!subscription) {
        return (
            <div className="p-6 bg-white rounded-xl border border-orange-500 shadow-sm flex items-center justify-center">
                <p className="text-slate-500">Aktif abonelik bulunamadı.</p>
            </div>
        );
    }

    const { status, billing_cycle, current_period_end, cancel_at_period_end, ai_product_key, is_trial, trial_ends_at } = subscription;
    const packageName = getPackageName(subscription);
    const isCanceled = status === 'canceled';
    const isCorporate = ai_product_key?.startsWith('uppypro_corporate_');

    // Trial kontrolü
    const trialEndDate = trial_ends_at ? new Date(trial_ends_at) : null;
    const formattedTrialEndDate = trialEndDate?.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    // Fiyat formatla
    let formattedPrice = '-';
    if (customPriceUsd) {
        formattedPrice = `$${customPriceUsd}`;
    } else if (customPriceTry) {
        formattedPrice = `${(customPriceTry / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL + KDV`;
    } else if (price?.monthly_price_try) {
        formattedPrice = `${price.monthly_price_try.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} TL + KDV`;
    } else if (priceUsd) {
        formattedPrice = `$${priceUsd}`;
    }

    const formattedEndDate = current_period_end
        ? new Date(current_period_end).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
        : '-';

    const currentProductKey = ai_product_key || 'uppypro_inbox';
    const isInTrial = is_trial && trial_ends_at && new Date(trial_ends_at) > new Date();
    const hasPendingDowngrade = !!subscription.pending_product_key;
    const pendingPlanName = subscription.pending_product_key ? getPackageName({ ai_product_key: subscription.pending_product_key }) : '';

    // Self-service paketleri filtrele (mevcut paket hariç)
    const availablePlans = allPrices?.filter(p =>
        SELF_SERVICE_PLANS.includes(p.product_key as any) && p.product_key !== currentProductKey
    ) || [];

    const handleCancel = async () => {
        if (!cancelReason) return;
        setIsLoading(true);
        try {
            const result = await cancelUserSubscription(cancelReason, cancelDetails);
            if (result.error) {
                toast({ variant: "destructive", title: "Hata", description: result.error });
                return;
            }
            toast({ title: "Başarılı", description: "Aboneliğiniz iptal edildi." });
            setIsCancelModalOpen(false);
            router.refresh();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Hata", description: "Beklenmeyen bir hata oluştu." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRetry = async () => {
        setIsLoading(true);
        try {
            const result = await retryUserPayment();
            if (result.error) {
                toast({ variant: "destructive", title: "Hata", description: result.error });
                return;
            }
            toast({ title: "İşlem Başarılı", description: result.message });
            router.refresh();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Hata", description: "Beklenmeyen bir hata oluştu." });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePlanChange = async () => {
        if (!selectedChangePlan) return;
        setIsLoading(true);
        try {
            const isUpgrading = isPlanUpgrade(currentProductKey, selectedChangePlan);

            if (isUpgrading) {
                const result = await upgradeUserPlan(selectedChangePlan);
                if (result.error) {
                    toast({ variant: "destructive", title: "Hata", description: result.error });
                    return;
                }
                if ('checkoutFormContent' in result && result.checkoutFormContent) {
                    setCheckoutFormContent(result.checkoutFormContent);
                    setIsPlanChangeModalOpen(false);
                    setTimeout(() => {
                        setShowCheckoutInPage(true);
                    }, 350);
                }
            } else {
                const result = await downgradeUserPlan(selectedChangePlan);
                if (result.error) {
                    toast({ variant: "destructive", title: "Hata", description: result.error });
                    return;
                }
                if ('success' in result && result.success) {
                    toast({ title: "Paket Değişikliği Planlandı ✅", description: result.message });
                    setIsPlanChangeModalOpen(false);
                    router.refresh();
                }
            }
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Hata", description: "Beklenmeyen bir hata oluştu." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelPendingDowngrade = async () => {
        setIsLoading(true);
        try {
            const result = await cancelPendingDowngrade();
            if (result.error) {
                toast({ variant: "destructive", title: "Hata", description: result.error });
            } else {
                toast({ title: "Başarılı", description: "Paket düşürme iptal edildi. Mevcut paketiniz devam edecek." });
                router.refresh();
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Hata", description: "Beklenmeyen bir hata oluştu." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleReactivate = async () => {
        if (!selectedReactivatePlan) {
            toast({ variant: "destructive", title: "Hata", description: "Lütfen bir paket seçin." });
            return;
        }
        setIsLoading(true);
        try {
            const result = await reactivateUserSubscription(selectedReactivatePlan);
            if (result.error) {
                toast({ variant: "destructive", title: "Hata", description: result.error });
                return;
            }
            if (result.checkoutFormContent) {
                setCheckoutFormContent(result.checkoutFormContent);
                // Önce Dialog'u kapat, ardından sayfa içi formu göster
                setIsReactivateModalOpen(false);
                // Dialog kapanma animasyonu bittikten sonra göster
                setTimeout(() => {
                    setShowCheckoutInPage(true);
                }, 350);
            }
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Hata", description: "Beklenmeyen bir hata oluştu." });
        } finally {
            setIsLoading(false);
        }
    };

    const isRetryable = status === 'past_due' || status === 'unpaid' || status === 'suspended';

    const getStatusBadge = () => {
        if (cancel_at_period_end) return null;
        if (isCanceled) {
            return <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100">İptal Edildi</Badge>;
        }
        if (isInTrial) {
            return <Badge variant="default" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">🎁 Deneme Süresi</Badge>;
        }
        if (status === 'active') {
            return <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">Aktif</Badge>;
        }
        return <Badge variant="destructive">{status}</Badge>;
    };

    // Eğer checkout formu sayfa içinde gösterilecekse, kartın yerine checkout alanı render et
    if (showCheckoutInPage) {
        return (
            <div className="bg-white rounded-xl border border-orange-500 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="font-bold text-lg text-slate-900">Ödeme</h3>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                            cleanupIyzicoDOM();
                            setShowCheckoutInPage(false);
                            setCheckoutFormContent("");
                            // Clean up any pending upgrade/downgrade intent since user cancelled
                            try {
                                await cancelPendingDowngrade();
                                router.refresh();
                            } catch (e) { /* ignore */ }
                        }}
                        className="text-slate-400 hover:text-slate-600"
                    >
                        <X className="w-4 h-4 mr-1" />
                        İptal
                    </Button>
                </div>
                <div className="p-6">
                    {/* Iyzico Checkout Form — Dialog dışında, tam sayfa erişimi ile */}
                    <div
                        ref={checkoutRef}
                        id="iyzipay-checkout-form"
                        className="min-h-[500px]"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 bg-white rounded-xl border border-orange-500 shadow-sm p-6">
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
                        {getStatusBadge()}
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
                        <span className="font-medium text-slate-900">{formattedPrice}</span>
                    </div>
                </div>

                <div className="space-y-1">
                    <p className="text-sm text-slate-500">
                        {cancel_at_period_end ? 'Erişim Bitiş Tarihi' : isCanceled ? 'İptal Tarihi' : isInTrial ? 'Deneme Bitiş Tarihi' : 'Sonraki Ödeme'}
                    </p>
                    <span className="font-medium text-slate-900">
                        {isCanceled && subscription.canceled_at
                            ? new Date(subscription.canceled_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
                            : isInTrial && formattedTrialEndDate
                                ? formattedTrialEndDate
                                : formattedEndDate
                        }
                    </span>
                </div>
            </div>

            {/* Trial Info Banner */}
            {isInTrial && (
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                    <div className="flex items-start gap-3">
                        <span className="text-xl">🎁</span>
                        <div>
                            <p className="text-sm font-semibold text-emerald-800">7 Günlük Ücretsiz Deneme Süresi</p>
                            <p className="text-xs text-emerald-700 mt-1">
                                Deneme süreniz <strong>{formattedTrialEndDate}</strong> tarihinde sona erecektir. 
                                Bu tarihe kadar iptal etmezseniz, abonelik ücretiniz otomatik olarak kartınızdan çekilecektir.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Pending Downgrade Banner */}
            {hasPendingDowngrade && (
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <Clock className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-orange-800">Paket Düşürme Planlandı</p>
                                <p className="text-xs text-orange-700 mt-1">
                                    Mevcut dönem sonunda (<strong>{formattedEndDate}</strong>) paketiniz <strong>{pendingPlanName}</strong> olarak değişecektir.
                                    Bu tarihe kadar mevcut paketinizin tüm özelliklerini kullanmaya devam edebilirsiniz.
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelPendingDowngrade}
                            disabled={isLoading}
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-100 shrink-0 text-xs"
                        >
                            <X className="w-3.5 h-3.5 mr-1" />
                            İptal Et
                        </Button>
                    </div>
                </div>
            )}

            {/* Actions Toolbar */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-end gap-3">

                {/* Retry Button */}
                {isRetryable && (
                    <Button
                        variant="default"
                        onClick={handleRetry}
                        disabled={isLoading}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Ödemeyi Tekrar Dene
                    </Button>
                )}

                {/* Reactivate Button */}
                {isCanceled && (
                    <Dialog open={isReactivateModalOpen} onOpenChange={(open) => {
                        setIsReactivateModalOpen(open);
                        if (!open) {
                            setSelectedReactivatePlan(currentProductKey);
                        }
                    }}>
                        <DialogTrigger asChild>
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => setSelectedReactivatePlan(currentProductKey)}
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Aboneliği Yeniden Başlat
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Aboneliği Yeniden Başlat</DialogTitle>
                                <DialogDescription>
                                    Aboneliğinizi tekrar başlatmak için bir paket seçin.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-4">
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-slate-700">Paket Seçimi</label>
                                    <div className="grid gap-3">
                                        {allPrices.filter(p => SELF_SERVICE_PLANS.includes(p.product_key as any)).map((p) => {
                                            const planName = getPackageName({ ai_product_key: p.product_key });
                                            const features = PLAN_FEATURES[p.product_key];
                                            const isSelected = selectedReactivatePlan === p.product_key;
                                            return (
                                                <div
                                                    key={p.product_key}
                                                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${isSelected
                                                        ? 'border-emerald-500 bg-emerald-50'
                                                        : 'border-slate-200 hover:border-slate-300 bg-white'
                                                        }`}
                                                    onClick={() => setSelectedReactivatePlan(p.product_key)}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-slate-900">{planName}</span>
                                                                {p.product_key === currentProductKey && (
                                                                    <Badge variant="secondary" className="text-xs bg-slate-100">Önceki Paketiniz</Badge>
                                                                )}
                                                            </div>
                                                            {features && (
                                                                <ul className="text-xs text-slate-500 space-y-0.5 mt-1.5">
                                                                    {features.features.map(f => (
                                                                        <li key={f} className="flex items-center gap-1">
                                                                            <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                                                                            {f}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        </div>
                                                        <div className="text-right shrink-0 ml-4">
                                                            <span className="font-bold text-lg text-slate-900">
                                                                {p.monthly_price_try?.toLocaleString('tr-TR', { minimumFractionDigits: 0 })} TL
                                                            </span>
                                                            <span className="text-xs text-slate-500 block">+ KDV / ay</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="bg-blue-50 p-3 rounded-md border border-blue-100 text-sm text-blue-800">
                                    <strong>Bilgi:</strong> Ödeme formu bu sayfada açılacak ve güvenli şekilde tamamlayabilirsiniz.
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsReactivateModalOpen(false)}>Vazgeç</Button>
                                <Button
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                    onClick={handleReactivate}
                                    disabled={!selectedReactivatePlan || isLoading}
                                >
                                    {isLoading ? 'Hazırlanıyor...' : 'Devam Et'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}

                {/* Plan Change Button - only for non-corporate active subscriptions */}
                {status === 'active' && !cancel_at_period_end && !isCorporate && availablePlans.length > 0 && (
                    <Dialog open={isPlanChangeModalOpen} onOpenChange={(open) => {
                        setIsPlanChangeModalOpen(open);
                        if (!open) setSelectedChangePlan("");
                    }}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <ArrowLeftRight className="w-4 h-4 mr-2" />
                                Paket Değiştir
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Paket Değiştir</DialogTitle>
                                <DialogDescription>
                                    Mevcut paketiniz: <strong>{packageName}</strong>. Geçiş yapmak istediğiniz paketi seçin.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-3">
                                {/* Plan Cards */}
                                {availablePlans.map((p) => {
                                    const planName = getPackageName({ ai_product_key: p.product_key });
                                    const isUp = isPlanUpgrade(currentProductKey, p.product_key);
                                    const isDown = isPlanDowngrade(currentProductKey, p.product_key);
                                    const isSelected = selectedChangePlan === p.product_key;
                                    const features = PLAN_FEATURES[p.product_key];
                                    const isDisabledByTrial = isInTrial && isDown;

                                    return (
                                        <div
                                            key={p.product_key}
                                            className={`p-4 rounded-lg border-2 transition-all ${isDisabledByTrial
                                                ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                                                : isSelected
                                                    ? isUp ? 'border-emerald-500 bg-emerald-50' : 'border-orange-400 bg-orange-50'
                                                    : 'border-slate-200 hover:border-slate-300 bg-white cursor-pointer'
                                                }`}
                                            onClick={() => !isDisabledByTrial && setSelectedChangePlan(p.product_key)}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-slate-900">{planName}</span>
                                                        {isUp && (
                                                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px] px-1.5 py-0 gap-0.5">
                                                                <ArrowUp className="w-3 h-3" /> Yükselt
                                                            </Badge>
                                                        )}
                                                        {isDown && (
                                                            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 text-[10px] px-1.5 py-0 gap-0.5">
                                                                <ArrowDown className="w-3 h-3" /> Düşür
                                                            </Badge>
                                                        )}
                                                        {isDisabledByTrial && (
                                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Deneme süresinde kapalı</Badge>
                                                        )}
                                                    </div>
                                                    {features && (
                                                        <ul className="text-xs text-slate-500 space-y-0.5 mt-1">
                                                            {features.features.map(f => (
                                                                <li key={f} className="flex items-center gap-1">
                                                                    <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                                                                    {f}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                                <div className="text-right shrink-0 ml-4">
                                                    <span className="font-bold text-lg text-slate-900">
                                                        {p.monthly_price_try?.toLocaleString('tr-TR', { minimumFractionDigits: 0 })} TL
                                                    </span>
                                                    <span className="text-xs text-slate-500 block">+ KDV / ay</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Kurumsal Paket Kartı */}
                                <div className="p-4 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Building2 className="w-4 h-4 text-slate-600" />
                                                <span className="font-bold text-slate-700">Kurumsal Paket</span>
                                            </div>
                                            <p className="text-xs text-slate-500">Özel otomasyon ve fiyatlandırma içerir</p>
                                        </div>
                                        <a
                                            href="mailto:info@upgunai.com"
                                            className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                                        >
                                            <Mail className="w-4 h-4" />
                                            İletişime Geç
                                        </a>
                                    </div>
                                </div>

                                {/* Dynamic Info Box */}
                                {selectedChangePlan && (
                                    <div className={`p-3 rounded-lg border text-sm ${isPlanUpgrade(currentProductKey, selectedChangePlan)
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                        : 'bg-orange-50 border-orange-200 text-orange-800'
                                        }`}
                                    >
                                        {isPlanUpgrade(currentProductKey, selectedChangePlan) ? (
                                            <div className="flex items-start gap-2">
                                                <ArrowUp className="w-4 h-4 mt-0.5 shrink-0" />
                                                <div>
                                                    <strong>Paket Yükseltme</strong>
                                                    <p className="text-xs mt-1 opacity-80">
                                                        Yeni paketiniz hemen aktif olacaktır. Ödeme anında kartınızdan çekilecek ve yeni dönem bugünden başlayacaktır.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-start gap-2">
                                                <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                                                <div>
                                                    <strong>Paket Düşürme</strong>
                                                    <p className="text-xs mt-1 opacity-80">
                                                        Mevcut paketiniz <strong>{formattedEndDate}</strong> tarihine kadar aktif kalacaktır.
                                                        Bu tarihten itibaren yeni paket geçerli olacak ve aylık ücretiniz güncellenecektir.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsPlanChangeModalOpen(false)}>Vazgeç</Button>
                                <Button
                                    onClick={handlePlanChange}
                                    disabled={!selectedChangePlan || isLoading}
                                    className={selectedChangePlan && isPlanUpgrade(currentProductKey, selectedChangePlan)
                                        ? "bg-emerald-600 hover:bg-emerald-700"
                                        : "bg-orange-600 hover:bg-orange-700"
                                    }
                                >
                                    {isLoading ? 'İşleniyor...' : selectedChangePlan && isPlanUpgrade(currentProductKey, selectedChangePlan) ? 'Yükselt ve Öde' : 'Düşürmeyi Onayla'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}

                {/* Corporate plan info - contact for changes */}
                {status === 'active' && !cancel_at_period_end && isCorporate && (
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                        Paket değişikliği için <a href="mailto:info@upgunai.com" className="text-blue-600 underline">info@upgunai.com</a> ile iletişime geçin.
                    </div>
                )}

                {/* Cancel Button */}
                {status === 'active' && !cancel_at_period_end && (
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
                                    <strong>Bilgi:</strong> İptal etseniz bile, mevcut dönem sonuna kadar ({formattedEndDate}) sistemimizi kullanmaya devam edebilirsiniz.
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
                )}
            </div>

            {/* Scheduled Cancellation Message */}
            {cancel_at_period_end && (
                <div className="pt-4 border-t border-slate-100">
                    <p className="text-sm text-slate-500">
                        Aboneliğiniz <strong>{formattedEndDate}</strong> tarihinde sona erecektir.
                    </p>
                </div>
            )}

            {/* Canceled Info */}
            {isCanceled && (
                <div className="pt-4 border-t border-slate-100">
                    <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                        <p className="text-sm text-red-800">
                            Aboneliğiniz iptal edilmiştir. Tekrar abone olmak için <strong>"Aboneliği Yeniden Başlat"</strong> butonunu kullanabilirsiniz.
                            {subscription.cancel_reason && (
                                <span className="block mt-1 text-red-600">
                                    İptal sebebi: {
                                        subscription.cancel_reason === 'PRICE' ? 'Fiyat yüksek' :
                                            subscription.cancel_reason === 'NOT_USING' ? 'Kullanmıyorum' :
                                                subscription.cancel_reason === 'MISSING_FEATURE' ? 'Aradığım özellik yok' :
                                                    subscription.cancel_reason === 'TECH_ISSUE' ? 'Teknik sorun' :
                                                        subscription.cancel_reason
                                    }
                                </span>
                            )}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
