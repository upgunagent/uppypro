
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PricingForm } from "./pricing-form";

export default async function AdminPricingPage() {
    const supabase = await createClient();

    // Check Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: member } = await supabase.from("tenant_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "agency_admin")
        .single();

    if (!member) redirect("/panel/inbox");

    // Fetch Pricing
    const { data: prices } = await supabase
        .from("pricing")
        .select("*")
        .in("product_key", ["uppypro_inbox", "uppypro_ai"])
        .eq("billing_cycle", "monthly");

    const inboxPrice = prices?.find(p => p.product_key === "uppypro_inbox")?.monthly_price_try || 0;
    const aiPrice = prices?.find(p => p.product_key === "uppypro_ai")?.monthly_price_try || 0;

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Fiyatlandırma Yönetimi</h1>
            <p className="text-slate-500 mb-8">
                Paketlerin aylık ücretlerini güncelleyin. Bu değişiklikler tüm panellerde ve ana sayfada anında görünür.
            </p>

            <div className="grid gap-6">
                <PricingForm
                    label="UppyPro Inbox"
                    productKey="uppypro_inbox"
                    currentPrice={inboxPrice}
                    description="Küçük işletmeler için temel paket."
                />

                <PricingForm
                    label="UppyPro AI"
                    productKey="uppypro_ai"
                    currentPrice={aiPrice}
                    description="Otomasyon ve AI asistan içeren paket."
                />
            </div>
        </div>
    );
}
