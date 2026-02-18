import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PaymentForm } from "./payment-form";
import { getPackageName } from "@/lib/subscription-utils";
import { MagicLinkExchange } from "./magic-link-exchange";

export default async function CompletePaymentPage({ searchParams }: { searchParams: { status?: string, reason?: string, source?: string } }) {
    const supabase = await createClient();

    // Check Auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        // User might have arrived via magic link with token in URL hash.
        // The server can't see the hash, so we render a client component that
        // will exchange the token and reload the page.
        return <MagicLinkExchange />;
    }

    // Get Pending Subscription
    const { data: member } = await supabase.from("tenant_members").select("tenant_id").eq("user_id", user.id).single();
    if (!member) return <div>Üyelik bulunamadı.</div>;

    const { data: subscription } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("tenant_id", member.tenant_id)
        .eq("status", "pending")
        .single();

    if (!subscription) {
        // Already active?
        return redirect("/panel");
    }

    const { getUsdExchangeRate } = await import("@/lib/currency");
    const usdRate = await getUsdExchangeRate();

    // Determine USD Price
    let priceUsd = 0;
    if (subscription.custom_price_usd) {
        priceUsd = Number(subscription.custom_price_usd);
    } else if (subscription.custom_price_try) {
        // Legacy fallback
        priceUsd = subscription.custom_price_try / 100 / 34; // rough est or just hide
    } else {
        // Standard Pkg
        // Assuming subscription has product keys
        const isAi = subscription.ai_product_key === 'uppypro_ai';
        const isEnterprise = subscription.ai_product_key === 'uppypro_enterprise';

        // Fetch current pricing from DB or hardcode standard since we know them
        // For robustness, let's hardcode standard $19 / $79 if not found, 
        // to avoid another DB call here for simplicity, or fetch properly.
        // Let's rely on standard values for now or fetch.
        // Better: Fetch pricing.
        const { data: prices } = await supabase.from("pricing").select("*").in("product_key", ["uppypro_inbox", "uppypro_ai"]);
        const inboxPrice = prices?.find(p => p.product_key === 'uppypro_inbox');
        const aiPrice = prices?.find(p => p.product_key === 'uppypro_ai');

        const inboxUsd = inboxPrice?.monthly_price_usd || 19;
        const aiUsd = aiPrice?.monthly_price_usd || 79;

        priceUsd = isAi || isEnterprise ? aiUsd : inboxUsd;
    }

    // Determine Iyzico Plan Code
    // First check subscription specific override (if any)
    let iyzicoPlanCode = subscription.iyzico_pricing_plan_reference_code; // If we saved it on sub creation

    if (!iyzicoPlanCode) {
        // Fallback to finding it from pricing table based on product
        const { data: prices } = await supabase.from("pricing").select("product_key, iyzico_pricing_plan_reference_code").in("product_key", ["uppypro_inbox", "uppypro_ai"]);
        const productKey = (subscription.ai_product_key === 'uppypro_ai' || subscription.ai_product_key === 'uppypro_enterprise') ? 'uppypro_ai' : 'uppypro_inbox';
        const priceRecord = prices?.find(p => p.product_key === productKey);
        iyzicoPlanCode = priceRecord?.iyzico_pricing_plan_reference_code;
    }

    const priceTry = Math.ceil(priceUsd * usdRate); // Round up to be safe/clean
    const packageName = getPackageName(subscription); // Should be UppyPro Kurumsal

    // Fetch Billing Info for PayTR
    const { data: billingInfo } = await supabase.from("billing_info").select("*").eq("tenant_id", member.tenant_id).single();

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
                <div className="text-center mb-8">
                    <img src="/brand-logo-text.png" alt="UPGUN AI" className="h-8 mx-auto mb-6" />
                    <h1 className="text-2xl font-bold text-slate-900">Aboneliği Tamamla</h1>
                    <p className="text-slate-500 mt-2">
                        Sayın yetkili, <strong>{packageName}</strong> üyeliğiniz için tanımlanan ödemeyi tamamlayarak hesabınızı aktif edebilirsiniz.
                    </p>
                </div>

                <div className="bg-orange-50 p-6 rounded-xl border border-orange-100 mb-8 flex justify-between items-center">
                    <div>
                        <div className="text-sm text-orange-800 font-medium">Aylık Tutar</div>
                        <div className="text-2xl font-bold text-orange-900">
                            ${priceUsd}
                            <span className="text-sm font-normal text-orange-700 ml-2">
                                (≈ {priceTry.toLocaleString('tr-TR')} TL)
                            </span>
                        </div>
                        <div className="text-xs text-orange-600 mt-1">Güncel Kur: {usdRate.toFixed(2)} TL</div>
                    </div>
                    <div className="px-3 py-1 bg-white rounded text-xs font-bold text-orange-600 shadow-sm">
                        {subscription.custom_price_usd ? "Özel Fiyat" : "Standart Paket"}
                    </div>
                </div>

                <PaymentForm
                    tenantId={member.tenant_id}
                    amount={priceTry}
                    inviteToken={subscription.id} // Using subscription ID or similar as ref if no invite token needed, but usually we came from invite. 
                    // Actually inviteToken is passed to this page via ?token maybe? 
                    // The page checks user session. The invite token logic was for *signup*. 
                    // Here we are likely in "Complete Payment" flow which triggers after clicking link in email?
                    // The user is logged in via "recovery" link. 
                    // So we might not have the raw invite token here unless passed in URL.
                    // But we don't strictly need it if we know the tenant.
                    userData={{
                        email: user.email!,
                        name: billingInfo?.contact_name || user.user_metadata.full_name || "Kullanıcı",
                        phone: billingInfo?.contact_phone || user.user_metadata.phone || "905555555555",
                        address: billingInfo?.address_full || "Adres bilgisi yok",
                        city: billingInfo?.address_city || "İstanbul",
                        district: billingInfo?.address_district || "Merkez",
                        identityNumber: billingInfo?.identity_number // Add if available
                    }}
                    pricingPlanReferenceCode={iyzicoPlanCode}
                />

                <p className="text-center text-xs text-slate-400 mt-6">
                    © 2024 UPGUN AI Güvenli Ödeme Altyapısı
                </p>
            </div>
        </div>
    );
}
