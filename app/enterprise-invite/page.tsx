import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { PaymentForm } from "@/app/complete-payment/payment-form";

export default async function EnterpriseInvitePage({
    searchParams,
}: {
    searchParams: { token?: string };
}) {
    const token = searchParams.token;

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
        .from("invite_tokens")
        .select("*")
        .eq("token", token)
        .single();

    if (!invite || new Date(invite.expires_at) < new Date()) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-red-50 text-red-800 p-4 rounded-lg">
                    Bu davet süresi dolmuş veya geçersiz.
                </div>
            </div>
        );
    }

    // Check if already used
    if (invite.used_at) {
        redirect("/login");
    }

    // Get tenant and subscription info for display
    const { data: subscription } = await adminDb
        .from("subscriptions")
        .select("*")
        .eq("tenant_id", invite.tenant_id)
        .eq("status", "pending")
        .single();

    if (!subscription) {
        redirect("/login");
    }

    const price = subscription.custom_price_try ? subscription.custom_price_try / 100 : 0;

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
                <div className="text-center mb-8">
                    <img src="/brand-logo-text.png" alt="UPGUN AI" className="h-8 mx-auto mb-6" />
                    <h1 className="text-2xl font-bold text-slate-900">Aboneliği Tamamla</h1>
                    <p className="text-slate-500 mt-2">
                        <strong>UppyPro Kurumsal</strong> üyel iğiniz için ödemeyi tamamlayın.
                    </p>
                </div>

                <div className="bg-orange-50 p-6 rounded-xl border border-orange-100 mb-8 flex justify-between items-center">
                    <div>
                        <div className="text-sm text-orange-800 font-medium">Aylık Tutar</div>
                        <div className="text-2xl font-bold text-orange-900">{price.toLocaleString('tr-TR')} TL</div>
                    </div>
                    <div className="px-3 py-1 bg-white rounded text-xs font-bold text-orange-600 shadow-sm">
                        Özel Fiyat
                    </div>
                </div>

                <PaymentForm tenantId={invite.tenant_id} amount={price} inviteToken={token} />

                <p className="text-center text-xs text-slate-400 mt-6">
                    © 2024 UPGUN AI Güvenli Ödeme Altyapısı
                </p>
            </div>
        </div>
    );
}
