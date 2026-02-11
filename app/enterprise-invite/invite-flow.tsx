"use client";

import { useState } from "react";
import { AgreementData, DistanceSalesAgreement, PreliminaryInformationForm, KvkkContent } from "@/components/wizard/legal-contents";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PaymentForm } from "@/app/complete-payment/payment-form";
import { ShieldCheck, ArrowRight } from "lucide-react";

type EnterpriseInviteFlowProps = {
    tenant: any;
    billingInfo: any;
    subscription: any;
    priceUsd: number;
    priceTry: number;
    exchangeRate: number;
    inviteToken: string;
    paymentError?: boolean;
};

export function EnterpriseInviteFlow({
    tenant,
    billingInfo,
    subscription,
    priceUsd,
    priceTry,
    exchangeRate,
    inviteToken,
    paymentError
}: EnterpriseInviteFlowProps) {
    const [agreementsConfirmed, setAgreementsConfirmed] = useState(false);
    const [kvkkConfirmed, setKvkkConfirmed] = useState(false);
    const [showDistanceAgreement, setShowDistanceAgreement] = useState(false);
    const [showPreInfoForm, setShowPreInfoForm] = useState(false);
    const [showKvkk, setShowKvkk] = useState(false);
    const [step, setStep] = useState<'agreements' | 'payment'>('agreements');

    // Use billing info if available, otherwise fallback to tenant (though billing info should exist for corporate invites)
    const buyerName = billingInfo?.billing_type === 'individual'
        ? (billingInfo?.full_name || tenant.name)
        : (billingInfo?.company_name || tenant.name);

    const agreementData: AgreementData = {
        buyer: {
            name: buyerName,
            email: billingInfo?.contact_email || "yetkili@sirket.com",
            phone: billingInfo?.contact_phone || "",
            address: billingInfo?.address_full || tenant.address || "",
            city: billingInfo?.address_city || tenant.city || "",
            district: billingInfo?.address_district || tenant.district || "",
            taxOffice: billingInfo?.tax_office,
            taxNumber: billingInfo?.tax_number,
            tckn: billingInfo?.tckn,
        },
        plan: {
            name: "UppyPro Kurumsal",
            price: priceTry / 1.20, // Approx base price
            total: priceTry,
            priceUsd: priceUsd,
        },
        exchangeRate: exchangeRate,
        date: new Date().toLocaleDateString('tr-TR'),
    };

    if (step === 'payment') {
        return (
            <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
                <div className="text-center mb-8">
                    <img src="/brand-logo-text.png" alt="UPGUN AI" className="h-8 mx-auto mb-6" />
                    <h1 className="text-2xl font-bold text-slate-900">Aboneliği Tamamla</h1>
                    <p className="text-slate-500 mt-2">
                        <strong>{tenant.name}</strong> için ödemeyi tamamlayın.
                    </p>
                </div>

                {paymentError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start">
                        <div className="mr-3 mt-1">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-semibold">Ödeme Başarısız</p>
                            <p className="text-sm">Ödeme işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.</p>
                        </div>
                    </div>
                )}

                <div className="bg-orange-50 p-6 rounded-xl border border-orange-100 mb-8 flex justify-between items-center">
                    <div>
                        <div className="text-sm text-orange-800 font-medium">Aylık Tutar</div>
                        <div className="text-2xl font-bold text-orange-900">{priceTry.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</div>
                        <div className="text-xs text-orange-700 mt-1">({priceUsd} USD + KDV karşılığı)</div>
                    </div>
                </div>

                <PaymentForm
                    tenantId={tenant.id}
                    amount={priceTry}
                    inviteToken={inviteToken}
                    userData={agreementData.buyer}
                />
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
            <div className="text-center mb-8">
                <ShieldCheck className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-slate-900">Sözleşme Onayı</h1>
                <p className="text-slate-500 mt-2">
                    Aboneliğinizi başlatmadan önce lütfen aşağıdaki sözleşmeleri onaylayın.
                </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8 space-y-4 text-sm text-slate-700">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span>Hizmet:</span>
                    <span className="font-semibold">UppyPro Kurumsal</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span>Aylık Bedel (USD):</span>
                    <span className="font-semibold">{priceUsd.toFixed(2)} USD + KDV</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span>Güncel Kur (TCMB):</span>
                    <span className="font-semibold">{exchangeRate.toFixed(4)} TL</span>
                </div>
                <div className="flex justify-between pt-2 text-base">
                    <span className="font-bold text-slate-900">Toplam (TL):</span>
                    <span className="font-bold text-orange-600">{priceTry.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</span>
                </div>
            </div>

            <div className="space-y-4 mb-8">
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                    <Checkbox
                        id="agreements"
                        checked={agreementsConfirmed}
                        onCheckedChange={(c) => setAgreementsConfirmed(c === true)}
                    />
                    <label htmlFor="agreements" className="text-sm text-slate-600 leading-snug cursor-pointer select-none">
                        <span className="font-medium text-slate-900 hover:underline" onClick={(e) => { e.preventDefault(); setShowPreInfoForm(true); }}>
                            Ön Bilgilendirme Formu
                        </span> ve <span className="font-medium text-slate-900 hover:underline" onClick={(e) => { e.preventDefault(); setShowDistanceAgreement(true); }}>
                            Mesafeli Satış Sözleşmesi
                        </span>'ni okudum, onaylıyorum.
                    </label>
                </div>

                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                    <Checkbox
                        id="kvkk"
                        checked={kvkkConfirmed}
                        onCheckedChange={(c) => setKvkkConfirmed(c === true)}
                    />
                    <label htmlFor="kvkk" className="text-sm text-slate-600 leading-snug cursor-pointer select-none">
                        <span className="font-medium text-slate-900 hover:underline" onClick={(e) => { e.preventDefault(); setShowKvkk(true); }}>
                            KVKK Aydınlatma Metni
                        </span>'ni okudum, anladım.
                    </label>
                </div>
            </div>

            <Button
                onClick={() => setStep('payment')}
                disabled={!agreementsConfirmed || !kvkkConfirmed}
                className="w-full bg-slate-900 hover:bg-slate-800 h-12 text-lg"
            >
                Ödemeye Geç <ArrowRight className="w-5 h-5 ml-2" />
            </Button>

            {/* Modals */}
            <Dialog open={showDistanceAgreement} onOpenChange={setShowDistanceAgreement}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DistanceSalesAgreement data={agreementData} />
                </DialogContent>
            </Dialog>

            <Dialog open={showPreInfoForm} onOpenChange={setShowPreInfoForm}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <PreliminaryInformationForm data={agreementData} />
                </DialogContent>
            </Dialog>

            <Dialog open={showKvkk} onOpenChange={setShowKvkk}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <KvkkContent />
                </DialogContent>
            </Dialog>
        </div>
    );
}
