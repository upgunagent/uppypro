import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PaymentForm } from "./payment-form";
import { MagicLinkExchange } from "./magic-link-exchange";
import { SetPasswordForm } from "./set-password-form";

export default async function CompletePaymentPage({ searchParams }: { searchParams: Promise<{ status?: string, reason?: string, source?: string }> }) {
    const supabase = await createClient();
    const params = await searchParams;

    // Check Auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return <MagicLinkExchange />;
    }

    // Get Tenant
    const { data: member } = await supabase.from("tenant_members").select("tenant_id").eq("user_id", user.id).single();
    if (!member) return <div>Üyelik bulunamadı.</div>;

    // If coming back from successful payment, show password form
    const isPostPayment = params?.status === 'success';

    if (isPostPayment) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
                    <div className="text-center mb-8">
                        <img src="/brand-logo-text.png" alt="UPGUN AI" className="h-8 mx-auto mb-6" />
                        <h1 className="text-2xl font-bold text-slate-900">Ödeme Başarılı!</h1>
                        <p className="text-slate-500 mt-2">Hesabınız için bir şifre belirleyin.</p>
                    </div>
                    <SetPasswordForm />
                </div>
            </div>
        );
    }

    const { data: subscription } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("tenant_id", member.tenant_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    if (!subscription) {
        return redirect("/login");
    }

    // Fetch TL pricing from DB using the subscription's product key
    const productKey = subscription.ai_product_key || 'uppypro_inbox';
    const { data: pricingData } = await supabase
        .from('pricing')
        .select('monthly_price_try, iyzico_pricing_plan_reference_code, products(name)')
        .eq('product_key', productKey)
        .eq('billing_cycle', 'monthly')
        .single();

    const basePriceTry = pricingData?.monthly_price_try || 0;
    const totalPriceTry = basePriceTry * 1.2; // KDV dahil
    const packageName = (pricingData?.products as any)?.name || 'UppyPro';
    const iyzicoPlanCode = subscription.iyzico_pricing_plan_reference_code || pricingData?.iyzico_pricing_plan_reference_code || '';

    const formattedBase = basePriceTry.toLocaleString('tr-TR', { minimumFractionDigits: 0 });
    const formattedTotal = totalPriceTry.toLocaleString('tr-TR', { minimumFractionDigits: 2 });

    // Fetch Billing Info
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

                <div className="bg-orange-50 p-6 rounded-xl border border-orange-100 mb-8">
                    <div className="text-sm text-orange-800 font-medium">Aylık Tutar</div>
                    <div className="text-2xl font-bold text-orange-900">
                        {formattedTotal} TL
                    </div>
                    <div className="text-xs text-orange-700 mt-1">({formattedBase} TL + KDV dahil)</div>
                </div>

                <PaymentForm
                    tenantId={member.tenant_id}
                    amount={totalPriceTry}
                    inviteToken={subscription.id}
                    userData={{
                        email: user.email!,
                        name: billingInfo?.contact_name || user.user_metadata.full_name || "Kullanıcı",
                        phone: billingInfo?.contact_phone || user.user_metadata.phone || "905555555555",
                        address: billingInfo?.address_full || "Adres bilgisi yok",
                        city: billingInfo?.address_city || "İstanbul",
                        district: billingInfo?.address_district || "Merkez",
                        identityNumber: billingInfo?.identity_number
                    }}
                    pricingPlanReferenceCode={iyzicoPlanCode}
                />

                <p className="text-center text-xs text-slate-400 mt-6">
                    © {new Date().getFullYear()} UPGUN AI Güvenli Ödeme Altyapısı
                </p>
            </div>
        </div>
    );
}
