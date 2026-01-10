import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PaymentForm } from "./payment-form";
import { getPackageName } from "@/lib/subscription-utils";

export default async function CompletePaymentPage() {
    const supabase = await createClient();

    // Check Auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        // If not logged in, user likely didn't use the magic link correctly or session expired.
        // But since we use recovery link, they SHOULD be logged in.
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-red-50 text-red-800 p-4 rounded-lg">
                    Oturum açılamadı. Lütfen e-postadaki linke tekrar tıklayın.
                </div>
            </div>
        );
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

    const price = subscription.custom_price_try ? subscription.custom_price_try / 100 : 0;
    const packageName = getPackageName(subscription); // Should be UppyPro Kurumsal

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
                        <div className="text-2xl font-bold text-orange-900">{price.toLocaleString('tr-TR')} TL</div>
                    </div>
                    <div className="px-3 py-1 bg-white rounded text-xs font-bold text-orange-600 shadow-sm">
                        Özel Fiyat
                    </div>
                </div>

                <PaymentForm tenantId={member.tenant_id} amount={price} />

                <p className="text-center text-xs text-slate-400 mt-6">
                    © 2024 UPGUN AI Güvenli Ödeme Altyapısı
                </p>
            </div>
        </div>
    );
}
