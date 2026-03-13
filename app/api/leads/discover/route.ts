import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

interface PlaceResult {
    id: string;
    displayName?: { text: string };
    formattedAddress?: string;
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
    websiteUri?: string;
    googleMapsUri?: string;
    rating?: number;
    userRatingCount?: number;
    businessStatus?: string;
    regularOpeningHours?: any;
    location?: { latitude: number; longitude: number };
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
        const { sectorKeywords, city, district, sectorId, sectorName } = body;

        if (!sectorKeywords || !city) {
            return NextResponse.json({ error: "sectorKeywords ve city gerekli" }, { status: 400 });
        }

        if (!GOOGLE_MAPS_API_KEY) {
            return NextResponse.json({ error: "GOOGLE_MAPS_API_KEY tanımlanmamış" }, { status: 500 });
        }

        // Build search query
        const locationQuery = district ? `${district}, ${city}, Türkiye` : `${city}, Türkiye`;
        const results: PlaceResult[] = [];

        // Search for each keyword
        for (const keyword of sectorKeywords.slice(0, 3)) { // Max 3 keyword to limit API calls
            const searchQuery = `${keyword} ${locationQuery}`;

            const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
                    "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.rating,places.userRatingCount,places.businessStatus,places.regularOpeningHours,places.location"
                },
                body: JSON.stringify({
                    textQuery: searchQuery,
                    languageCode: "tr",
                    maxResultCount: 20
                })
            });

            if (!response.ok) {
                console.error(`Places API error for "${searchQuery}":`, await response.text());
                continue;
            }

            const data = await response.json();
            if (data.places) {
                for (const place of data.places) {
                    // Deduplicate by place ID
                    if (!results.find(r => r.id === place.id)) {
                        results.push(place);
                    }
                }
            }
        }

        // Log discovery
        const adminDb = createAdminClient();
        await adminDb.from("lead_discovery_logs").insert({
            sector_id: sectorId || null,
            city,
            district: district || null,
            query_used: sectorKeywords.join(", "),
            results_count: results.length,
            api_calls_used: Math.min(sectorKeywords.length, 3),
            created_by: user.id
        });

        // Transform results
        const leads = results.map((place) => ({
            google_place_id: place.id,
            business_name: place.displayName?.text || "Bilinmiyor",
            address: place.formattedAddress || "",
            phone: place.nationalPhoneNumber || place.internationalPhoneNumber || null,
            website: place.websiteUri || null,
            google_maps_url: place.googleMapsUri || null,
            google_rating: place.rating || null,
            google_review_count: place.userRatingCount || null,
            google_business_status: place.businessStatus || null,
            working_hours: place.regularOpeningHours || null,
            lat: place.location?.latitude || null,
            lng: place.location?.longitude || null,
            city,
            district: district || null,
            sector_id: sectorId || null,
            sector_name: sectorName || null,
            email_missing: true // Initially no email from Places API
        }));

        return NextResponse.json({
            success: true,
            count: leads.length,
            leads
        });

    } catch (error: any) {
        console.error("Lead discovery error:", error);
        return NextResponse.json({ error: error.message || "Beklenmeyen hata" }, { status: 500 });
    }
}
