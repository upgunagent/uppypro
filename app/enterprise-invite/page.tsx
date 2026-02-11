import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { EnterpriseInviteFlow } from "./invite-flow";
import { getExchangeRate } from "@/actions/pricing";

export default async function EnterpriseInvitePage({
    searchParams,
}: {
    searchParams: Promise<{ token?: string }>;
}) {
    const { token } = await searchParams;

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

    // Check if already used
    if (invite.used_at) {
        redirect("/login");
    }

    // Get tenant and subscription info
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
                    Abonelik bilgileri bulunamadı.
                </div>
            </div>
        );
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
            />
        </div>
    );
}
