
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
        .in("product_key", ["uppypro_inbox", "base_inbox", "inbox", "uppypro_ai", "uppypro_corporate_small", "uppypro_corporate_medium", "uppypro_corporate_large", "uppypro_corporate_xl"])
        .eq("billing_cycle", "monthly");

    const getPriceData = (key: string, defaultPrice: number) => {
        // Handle alternative keys for inbox just in case
        const found = prices?.find(p => p.product_key === key || (key === 'uppypro_inbox' && (p.product_key === 'base_inbox' || p.product_key === 'inbox')));
        return {
            price: found?.monthly_price_try || defaultPrice,
            code: found?.iyzico_pricing_plan_reference_code || "",
            // Use the actual product key from DB if it exists (e.g., base_inbox instead of uppypro_inbox) so updates go to the right row
            key: found?.product_key || key
        };
    };

    const inbox = getPriceData("uppypro_inbox", 895);
    const ai = getPriceData("uppypro_ai", 4794);
    const cSmall = getPriceData("uppypro_corporate_small", 5994);
    const cMedium = getPriceData("uppypro_corporate_medium", 8394);
    const cLarge = getPriceData("uppypro_corporate_large", 11994);
    const cXL = getPriceData("uppypro_corporate_xl", 15594);

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Fiyatlandırma Yönetimi</h1>
            <p className="text-slate-500 mb-8">
                Paketlerin aylık ücretlerini (TL) ve İyzico referans kodlarını güncelleyin.
                Değişiklikler ana sayfa ve kurumsal davet sayfasındaki fiyatları doğrudan etkileyecektir.
                Yeni bir İyzico planı oluşturduğunuzda referans kodunu buradan güncellemeyi unutmayın!
            </p>

            <div className="grid gap-6">
                <PricingForm
                    label="UppyPro Inbox"
                    productKey={inbox.key}
                    currentPrice={inbox.price}
                    currentCode={inbox.code}
                    description="Küçük işletmeler için temel paket fiyatı."
                />

                <PricingForm
                    label="UppyPro AI"
                    productKey={ai.key}
                    currentPrice={ai.price}
                    currentCode={ai.code}
                    description="Otomasyon ve AI asistan içeren paket fiyatı."
                />

                <h3 className="text-xl font-bold text-slate-800 mt-6 border-b pb-2">Kurumsal Paketler</h3>

                <PricingForm
                    label="Kurumsal (Small)"
                    productKey={cSmall.key}
                    currentPrice={cSmall.price}
                    currentCode={cSmall.code}
                    description="Small seviye kurumsal işletme paketi."
                />

                <PricingForm
                    label="Kurumsal (Medium)"
                    productKey={cMedium.key}
                    currentPrice={cMedium.price}
                    currentCode={cMedium.code}
                    description="Medium seviye kurumsal işletme paketi."
                />

                <PricingForm
                    label="Kurumsal (Large)"
                    productKey={cLarge.key}
                    currentPrice={cLarge.price}
                    currentCode={cLarge.code}
                    description="Large seviye kurumsal işletme paketi."
                />

                <PricingForm
                    label="Kurumsal (XL)"
                    productKey={cXL.key}
                    currentPrice={cXL.price}
                    currentCode={cXL.code}
                    description="XL seviye kurumsal işletme paketi."
                />
            </div>
        </div>
    );
}
