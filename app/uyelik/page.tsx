"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
    StepSummary,
    StepAccount,
    StepBillingType,
    StepBillingDetails,
    StepAgreements,
    StepPayment,
    StepSuccess,
    WizardData
} from "@/components/wizard/steps";
import { clsx } from "clsx";

function MembershipWizardContent() {
    const searchParams = useSearchParams();
    const [step, setStep] = useState(1);

    const [data, setData] = useState<WizardData>({
        plan: "base",
        fullName: "",
        email: "",
        phone: "",
        billingType: "individual",
        address: "",
        city: "",
        district: "",
        kvkk: false,
        terms: false,
        marketing: false
    });

    useEffect(() => {
        const plan = searchParams.get("plan");
        if (plan) setData(prev => ({ ...prev, plan }));
    }, [searchParams]);

    const updateData = (key: keyof WizardData, value: any) => {
        setData(prev => ({ ...prev, [key]: value }));
    };

    const next = () => setStep(s => s + 1);
    const back = () => setStep(s => s - 1);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            {/* Header */}
            <div className="mb-8 text-center">
                <img src="/brand-logo-text.png" alt="UPGUN AI" className="h-8 mx-auto mb-4" />
            </div>

            {/* Stepper */}
            {step < 7 && (
                <div className="w-full max-w-lg mb-8">
                    <div className="flex justify-between items-center relative">
                        {/* Background Line */}
                        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-200 -z-10" />

                        {/* Steps */}
                        {[1, 2, 3, 4, 5, 6].map((s) => (
                            <div
                                key={s}
                                className={clsx(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all",
                                    step >= s ? "bg-orange-600 border-orange-600 text-white" : "bg-white border-slate-300 text-slate-400"
                                )}
                            >
                                {s}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 mt-2 px-1">
                        <span>Paket</span>
                        <span>Hesap</span>
                        <span>Tip</span>
                        <span>Fatura</span>
                        <span>Onay</span>
                        <span>Ödeme</span>
                    </div>
                </div>
            )}

            {/* Content Card */}
            <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
                {step === 1 && <StepSummary data={data} updateData={updateData} onNext={next} />}
                {step === 2 && <StepAccount data={data} updateData={updateData} onNext={next} onBack={back} />}
                {step === 3 && <StepBillingType data={data} updateData={updateData} onNext={next} onBack={back} />}
                {step === 4 && <StepBillingDetails data={data} updateData={updateData} onNext={next} onBack={back} />}
                {step === 5 && <StepAgreements data={data} updateData={updateData} onNext={next} onBack={back} />}
                {step === 6 && <StepPayment data={data} onNext={next} onBack={back} />}
                {step === 7 && <StepSuccess />}
            </div>

            {/* Footer */}
            <div className="mt-8 text-slate-400 text-xs">
                © 2024 UPGUN AI Güvenli Ödeme Altyapısı
            </div>
        </div>
    );
}

export default function MembershipWizard() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <img src="/brand-logo-text.png" alt="UPGUN AI" className="h-8 opacity-50" />
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
            </div>
        }>
            <MembershipWizardContent />
        </Suspense>
    );
}
