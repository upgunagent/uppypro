"use client";

import { signupAction } from "@/app/actions/auth";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { clsx } from "clsx";

// Pricing Constants (In Kurus/Cents to match DB, but defined here for UI logic)
const PRICING = {
    monthly: {
        base: { price: 495, setup: 2500 }, // Base Inbox
        starter: { price: 2499, setup: 10000 },
        medium: { price: 4999, setup: 20000 },
        pro: { price: 8999, setup: 30000 },
    },
    annual: {
        base: { price: 495, setup: 0 },
        starter: { price: 2499, setup: 0 },
        medium: { price: 4999, setup: 0 },
        pro: { price: 8999, setup: 0 },
    },
};

type PlanTier = "none" | "starter" | "medium" | "pro";
type BillingCycle = "monthly" | "annual";

import { Suspense } from "react";

function SignupContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // Parse initial plan from URL
    const initialPlan = (searchParams.get("plan")?.replace("ai_", "") as PlanTier) || "none";
    // Filter out invalid plans just in case
    const defaultTier = ["none", "starter", "medium", "pro"].includes(initialPlan) ? initialPlan : "none";

    const [step, setStep] = useState<1 | 2>(1);
    const [tier, setTier] = useState<PlanTier>(defaultTier);
    const [cycle, setCycle] = useState<BillingCycle>("annual");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        companyName: "",
        fullName: "",
        email: "",
        password: "",
        phone: "",
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Calculations
    const selectedPricing = PRICING[cycle];
    const basePrice = selectedPricing.base.price;
    const aiPrice = tier === "none" ? 0 : selectedPricing[tier].price;
    const totalPriceMonthly = basePrice + aiPrice;

    const baseSetup = selectedPricing.base.setup;
    const aiSetup = tier === "none" ? 0 : selectedPricing[tier].setup;
    const totalSetup = baseSetup + aiSetup;

    const totalFirstPayment = cycle === "annual"
        ? (totalPriceMonthly * 12) // Annual total 
        : (totalPriceMonthly + totalSetup); // Monthly + Setup

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Call Server Action
            const result = await signupAction({
                email: formData.email,
                password: formData.password,
                fullName: formData.fullName,
                companyName: formData.companyName,
                phone: formData.phone,
                planIdx: { tier, cycle }
            });

            if (!result.success) {
                throw new Error(result.error);
            }

            // Success -> Redirect to Login or Payment (mock)
            router.push("/login?message=Hesabınız oluşturuldu. Lütfen giriş yapın.");

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container max-w-5xl py-12 px-4 mx-auto">
            <div className="grid md:grid-cols-2 gap-12">
                {/* Left: Plan Selection & Summary */}
                <div className="space-y-8 order-2 md:order-1">
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Paket Seçimi</h2>

                        {/* Cycle Toggle */}
                        <div className="flex items-center space-x-4 mb-6 bg-slate-900/50 p-1 rounded-lg w-fit">
                            <button
                                onClick={() => setCycle("monthly")}
                                className={clsx("px-4 py-2 rounded-md text-sm font-medium transition-all", cycle === "monthly" ? "bg-primary text-white" : "text-gray-400 hover:text-white")}
                            >
                                Aylık
                            </button>
                            <button
                                onClick={() => setCycle("annual")}
                                className={clsx("px-4 py-2 rounded-md text-sm font-medium transition-all", cycle === "annual" ? "bg-primary text-white" : "text-gray-400 hover:text-white")}
                            >
                                Yıllık (Kurulum Ücretsiz)
                            </button>
                        </div>

                        {/* Base Product Card (Always Selected) */}
                        <div className="p-4 border border-primary/50 bg-primary/5 rounded-xl mb-4 relative">
                            <div className="absolute top-3 right-3 text-primary"><Check size={20} /></div>
                            <h3 className="font-bold">WhatsApp + Instagram Inbox</h3>
                            <p className="text-sm text-gray-400">Temel Paket (Zorunlu)</p>
                            <div className="mt-2 text-xl font-bold">{selectedPricing.base.price} TL<span className="text-sm font-normal">/ay</span></div>
                            {cycle === "monthly" && <div className="text-xs text-orange-400">+ {selectedPricing.base.setup} TL Kurulum</div>}
                        </div>

                        {/* AI Add-ons */}
                        <h3 className="font-semibold mb-3">AI Asistanı Ekle (Opsiyonel)</h3>
                        <div className="space-y-3">
                            {[
                                { id: "none", name: "AI İstemiyorum", price: 0, setup: 0 },
                                { id: "starter", name: "Başlangıç AI (Bilgi Veren)", price: selectedPricing.starter.price, setup: selectedPricing.starter.setup },
                                { id: "medium", name: "Edim AI (2 Tool)", price: selectedPricing.medium.price, setup: selectedPricing.medium.setup },
                                { id: "pro", name: "Pro AI (4 Tool)", price: selectedPricing.pro.price, setup: selectedPricing.pro.setup },
                            ].map((p) => (
                                <div
                                    key={p.id}
                                    onClick={() => setTier(p.id as PlanTier)}
                                    className={clsx(
                                        "p-4 border cursor-pointer rounded-xl transition-all relative",
                                        tier === p.id ? "border-secondary bg-secondary/10" : "border-white/10 hover:border-white/20"
                                    )}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">{p.name}</span>
                                        {tier === p.id && <Check size={18} className="text-secondary" />}
                                    </div>
                                    {p.id !== "none" && (
                                        <div className="text-sm text-gray-400 mt-1">
                                            {p.price} TL/ay
                                            {cycle === "monthly" && p.setup > 0 && <span className="text-orange-400 ml-2">(+ {p.setup} TL Kurulum)</span>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Summary Box */}
                    <div className="p-6 bg-slate-900 rounded-xl border border-white/10">
                        <h3 className="font-bold border-b border-white/10 pb-2 mb-4">Sipariş Özeti</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span>Inbox Paketi ({cycle === "annual" ? "Yıllık" : "Aylık"})</span>
                                <span>{cycle === "annual" ? basePrice * 12 : basePrice} TL</span>
                            </div>
                            {tier !== "none" && (
                                <div className="flex justify-between">
                                    <span>{tier === "starter" ? "Başlangıç" : tier === "medium" ? "Edim" : "Pro"} AI ({cycle === "annual" ? "Yıllık" : "Aylık"})</span>
                                    <span>{cycle === "annual" ? aiPrice * 12 : aiPrice} TL</span>
                                </div>
                            )}

                            {cycle === "monthly" && totalSetup > 0 && (
                                <div className="flex justify-between text-orange-400">
                                    <span>Kurulum Ücreti (Tek Seferlik)</span>
                                    <span>{totalSetup} TL</span>
                                </div>
                            )}
                        </div>
                        <div className="border-t border-white/10 mt-4 pt-4 flex justify-between items-end">
                            <div>
                                <div className="text-sm text-gray-400">Toplam Ödenecek</div>
                                <div className="text-xs text-muted-foreground w-48">KDV Dahil Değildir.</div>
                            </div>
                            <div className="text-3xl font-bold text-primary">{totalFirstPayment.toLocaleString("tr-TR")} TL</div>
                        </div>
                    </div>
                </div>

                {/* Right: Registration Form */}
                <div className="order-1 md:order-2">
                    <div className="bg-glass p-8 border border-white/10 rounded-xl">
                        <h2 className="text-2xl font-bold mb-6">İşletme Bilgileri</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">İşletme Adı</label>
                                <Input name="companyName" required placeholder="Firma Adı Ltd. Şti." onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Yetkili Ad Soyad</label>
                                <Input name="fullName" required placeholder="Ali Veli" onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email Adresi</label>
                                <Input name="email" type="email" required placeholder="mail@firma.com" onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Telefon</label>
                                <Input name="phone" type="tel" required placeholder="0555 555 55 55" onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Şifre Belirleyin</label>
                                <Input name="password" type="password" required minLength={6} onChange={handleInputChange} />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-md text-sm">
                                    {error}
                                </div>
                            )}

                            <Button type="submit" size="lg" className="w-full mt-6" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {loading ? "İşleniyor..." : "Ödemeye Geç ve Üye Ol"}
                            </Button>
                            <p className="text-xs text-center text-gray-500 mt-4">
                                Ödemeye geçerek Hizmet Koşullarını kabul etmiş olursunuz.
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>}>
            <SignupContent />
        </Suspense>
    );
}
