import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// Bu endpoint uppypro_corporate_free ürününü pricing tablosuna ekler.
// Sadece bir kez çalıştırılması yeterlidir.
// GET /api/setup-free-plan
export async function GET(request: Request) {
    const adminDb = createAdminClient();

    // Zaten var mı kontrol et
    const { data: existing } = await adminDb
        .from("pricing")
        .select("id")
        .eq("product_key", "uppypro_corporate_free")
        .maybeSingle();

    if (existing) {
        return NextResponse.json({ message: "uppypro_corporate_free zaten mevcut", id: existing.id });
    }

    // Hem monthly hem yearly ekle
    const { data, error } = await adminDb
        .from("pricing")
        .insert([
            {
                product_key: "uppypro_corporate_free",
                billing_cycle: "monthly",
                monthly_price_try: 0,
                monthly_price_usd: 0,
                iyzico_pricing_plan_reference_code: null,
            }
        ])
        .select();

    if (error) {
        console.error("setup-free-plan error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, inserted: data });
}
