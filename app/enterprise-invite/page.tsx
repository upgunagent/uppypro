import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { EnterpriseInviteFlow } from "./invite-flow";
import { getExchangeRate } from "@/actions/pricing";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function EnterpriseInvitePage({
    searchParams,
}: {
    searchParams: Promise<{ token?: string; payment?: string }>;
}) {
    const { token, payment } = await searchParams;

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-red-50 text-red-800 p-4 rounded-lg">
                    Geçersiz davet linki.
                </div>
            </div>
        );
    }

    const adminDb = createAdminClient();

    // Validate token
    const { data: invite } = await adminDb
        .from("enterprise_invite_tokens")
        .select("*")
        .eq("token", token)
        .single();

    if (!invite || new Date(invite.expires_at) < new Date()) {
        const errorMsg = !invite ? "Davet bulunamadı." : "Davet süresi dolmuş.";
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-red-50 text-red-800 p-4 rounded-lg">
                    {errorMsg}
                </div>
            </div>
        );
    }

    // Check if subscription is already active
    // We do this because we don't mark token as used immediately after payment anymore
    const { data: existingSub } = await adminDb
        .from("subscriptions")
        .select("status")
        .eq("tenant_id", invite.tenant_id)
        .single();

    if (existingSub?.status === 'active') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
                <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg text-center">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Abonelik Zaten Aktif</h2>
                    <p className="text-slate-600 mb-6">
                        Bu işletme için abonelik zaten başlatılmış ve ödeme alınmış.
                    </p>
                    <Link href="/login">
                        <Button className="w-full bg-slate-900 hover:bg-slate-800">
                            Giriş Yap
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    // Check if already used logic (fallback)
    if (invite.used_at) {
        redirect("/login");
    }

    // Get tenant and pending subscription info
    const { data: tenant } = await adminDb
        .from("tenants")
        .select("*")
        .eq("id", invite.tenant_id)
        .single();

    const { data: subscription } = await adminDb
        .from("subscriptions")
        .select("*")
        .eq("tenant_id", invite.tenant_id)
        .eq("status", "pending")
        .single();

    if (!subscription || !tenant) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-red-50 text-red-800 p-4 rounded-lg">
                    Kalan ödeme veya abonelik bilgisi bulunamadı.
                </div>
            </div>
        );
    }

    if (payment === 'fail') {
        // Show error toast or message if redirected back with fail
    }

    // Get billing info
    const { data: billingInfo } = await adminDb
        .from("billing_info")
        .select("*")
        .eq("tenant_id", invite.tenant_id)
        .single();

    // Calculate Price
    const priceUsd = subscription.custom_price_usd || 0;
    const exchangeRate = await getExchangeRate();


    // Calculate TL Price (Price USD * Rate * 1.20 VAT)
    const priceTryExVat = priceUsd * exchangeRate;
    const priceTryTotal = priceTryExVat * 1.20;

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <EnterpriseInviteFlow
                tenant={tenant}
                billingInfo={billingInfo}
                subscription={subscription}
                priceUsd={priceUsd}
                priceTry={priceTryTotal}
                exchangeRate={exchangeRate}
                inviteToken={token}
                paymentError={payment === 'fail'}
            />
        </div>
    );
}
