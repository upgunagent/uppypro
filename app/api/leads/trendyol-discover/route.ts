import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

interface TrendyolSeller {
    sellerId: string;
    sellerName: string;
    storeUrl: string;
    phone?: string | null;
    website?: string | null;
    address?: string | null;
    google_place_id?: string | null;
    google_maps_url?: string | null;
    google_rating?: number | null;
    google_review_count?: number | null;
    email_missing?: boolean;
}

/**
 * Enrich seller names with Google Places data (phone, address, website, rating)
 * Search each seller name on Google to find their real business info.
 */
async function enrichWithGoogle(sellers: TrendyolSeller[]): Promise<TrendyolSeller[]> {
    if (!GOOGLE_MAPS_API_KEY) return sellers;

    const enriched: TrendyolSeller[] = [];

    for (const seller of sellers) {
        try {
            // Search Google Places for the business name
            const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
                    "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.rating,places.userRatingCount"
                },
                body: JSON.stringify({
                    textQuery: seller.sellerName,
                    languageCode: "tr",
                    maxResultCount: 1
                })
            });

            if (response.ok) {
                const data = await response.json();
                const places = data.places || [];

                if (places.length > 0) {
                    const place = places[0];
                    seller.phone = place.nationalPhoneNumber || place.internationalPhoneNumber || null;
                    seller.website = place.websiteUri || null;
                    seller.address = place.formattedAddress || null;
                    seller.google_place_id = place.id || null;
                    seller.google_maps_url = place.googleMapsUri || null;
                    seller.google_rating = place.rating || null;
                    seller.google_review_count = place.userRatingCount || null;
                }
            }

            // Rate limit Google API calls (200ms between requests)
            await new Promise(resolve => setTimeout(resolve, 200));

        } catch (err) {
            console.error(`Google enrichment error for ${seller.sellerName}:`, err);
        }

        enriched.push(seller);
    }

    return enriched;
}


export async function POST(req: NextRequest) {
    try {
        // Auth check
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: membership } = await supabase
            .from("tenant_members")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "agency_admin")
            .maybeSingle();

        if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const body = await req.json();
        const { sellers: rawSellers, categoryLabel } = body;

        if (!rawSellers || !Array.isArray(rawSellers) || rawSellers.length === 0) {
            return NextResponse.json({ error: "Mağaza listesi gerekli" }, { status: 400 });
        }

        // Parse incoming sellers (from client-side extraction)
        const sellers: TrendyolSeller[] = rawSellers.map((s: any) => ({
            sellerId: s.sellerId || s.id || String(Math.random()),
            sellerName: s.sellerName || s.name || "Bilinmiyor",
            storeUrl: s.storeUrl || s.url || "",
            email_missing: true
        }));

        // Enrich with Google Places API (max 30 to control API costs)
        const toEnrich = sellers.slice(0, 30);
        const remaining = sellers.slice(30).map(s => ({ ...s }));
        const enrichedSellers = await enrichWithGoogle(toEnrich);
        const allSellers = [...enrichedSellers, ...remaining];

        // Log the discovery
        try {
            const adminDb = createAdminClient();
            await adminDb.from("lead_discovery_logs").insert({
                sector_id: null,
                city: "Trendyol",
                district: categoryLabel || "Manuel Giriş",
                query_used: `trendyol-manual:${categoryLabel || "custom"}`,
                results_count: allSellers.length,
                api_calls_used: toEnrich.length,
                created_by: user.id
            });
        } catch (logErr) {
            console.error("Log insert error:", logErr);
        }

        return NextResponse.json({
            success: true,
            count: allSellers.length,
            category: categoryLabel || "Trendyol Mağazaları",
            sellers: allSellers
        });

    } catch (error: any) {
        console.error("Trendyol lead enrichment error:", error);
        return NextResponse.json({ error: error.message || "Beklenmeyen hata" }, { status: 500 });
    }
}
