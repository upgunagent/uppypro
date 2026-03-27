import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

interface TrendyolSeller {
    sellerId: string;
    sellerName: string;
    storeUrl: string;
    // Fields enriched from Google
    phone?: string | null;
    website?: string | null;
    address?: string | null;
    google_place_id?: string | null;
    google_maps_url?: string | null;
    google_rating?: number | null;
    google_review_count?: number | null;
    email_missing?: boolean;
}

// Trendyol category IDs for popular categories
const TRENDYOL_CATEGORIES: Record<string, { label: string; urls: string[] }> = {
    "elektronik": {
        label: "Elektronik",
        urls: [
            "https://www.trendyol.com/sr?q=elektronik&qt=elektronik&st=elektronik&os=1",
        ]
    },
    "giyim": {
        label: "Giyim",
        urls: [
            "https://www.trendyol.com/sr?q=giyim&qt=giyim&st=giyim&os=1",
        ]
    },
    "kozmetik": {
        label: "Kozmetik & Kişisel Bakım",
        urls: [
            "https://www.trendyol.com/sr?q=kozmetik&qt=kozmetik&st=kozmetik&os=1",
        ]
    },
    "ev-yasam": {
        label: "Ev & Yaşam",
        urls: [
            "https://www.trendyol.com/sr?q=ev+dekorasyon&qt=ev+dekorasyon&st=ev+dekorasyon&os=1",
        ]
    },
    "spor": {
        label: "Spor & Outdoor",
        urls: [
            "https://www.trendyol.com/sr?q=spor+outdoor&qt=spor+outdoor&st=spor+outdoor&os=1",
        ]
    },
    "anne-bebek": {
        label: "Anne & Bebek",
        urls: [
            "https://www.trendyol.com/sr?q=anne+bebek&qt=anne+bebek&st=anne+bebek&os=1",
        ]
    },
    "gida": {
        label: "Süpermarket & Gıda",
        urls: [
            "https://www.trendyol.com/sr?q=gida+market&qt=gida+market&st=gida+market&os=1",
        ]
    },
    "kitap": {
        label: "Kitap & Kırtasiye",
        urls: [
            "https://www.trendyol.com/sr?q=kitap+kirtasiye&qt=kitap+kirtasiye&st=kitap+kirtasiye&os=1",
        ]
    },
    "custom": {
        label: "Özel Arama",
        urls: []
    }
};

/**
 * Scrape Trendyol search/category pages to extract seller information
 */
async function scrapeTrendyolSellers(searchQuery: string, maxPages: number = 2): Promise<TrendyolSeller[]> {
    const sellers = new Map<string, TrendyolSeller>();

    for (let page = 1; page <= maxPages; page++) {
        const url = `https://www.trendyol.com/sr?q=${encodeURIComponent(searchQuery)}&qt=${encodeURIComponent(searchQuery)}&st=${encodeURIComponent(searchQuery)}&os=1&pi=${page}`;

        try {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Connection": "keep-alive",
                    "Cache-Control": "no-cache",
                },
            });

            if (!response.ok) {
                console.error(`Trendyol fetch error (page ${page}): ${response.status}`);
                continue;
            }

            const html = await response.text();

            // Extract seller data from HTML using regex patterns
            // Trendyol embeds JSON data in script tags
            const jsonDataMatch = html.match(/__SEARCH_APP_INITIAL_STATE__\s*=\s*([\s\S]*?);\s*<\/script>/);
            
            if (jsonDataMatch) {
                try {
                    const searchData = JSON.parse(jsonDataMatch[1]);
                    const products = searchData?.result?.products || searchData?.products || [];
                    
                    for (const product of products) {
                        const merchantId = product.merchantId?.toString() || product.sellerId?.toString();
                        const merchantName = product.merchantName || product.sellerName || product.brandName;
                        
                        if (merchantId && merchantName && !sellers.has(merchantId)) {
                            sellers.set(merchantId, {
                                sellerId: merchantId,
                                sellerName: merchantName,
                                storeUrl: `https://www.trendyol.com/magaza/${merchantName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-çğıöşü]/g, '')}-m-${merchantId}`,
                                email_missing: true
                            });
                        }
                    }
                } catch (parseErr) {
                    console.error("JSON parse error:", parseErr);
                }
            }

            // Fallback: try to extract from HTML patterns
            if (sellers.size === 0) {
                // Regex to find merchant links in HTML
                const merchantPattern = /magaza\/([^"'\s]+)-m-(\d+)/g;
                let match;
                while ((match = merchantPattern.exec(html)) !== null) {
                    const sellerSlug = match[1];
                    const sellerId = match[2];
                    if (!sellers.has(sellerId)) {
                        const sellerName = sellerSlug
                            .replace(/-/g, ' ')
                            .replace(/\b\w/g, l => l.toUpperCase());
                        sellers.set(sellerId, {
                            sellerId,
                            sellerName,
                            storeUrl: `https://www.trendyol.com/magaza/${sellerSlug}-m-${sellerId}`,
                            email_missing: true
                        });
                    }
                }
            }

            // Rate limiting - wait between page fetches
            if (page < maxPages) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

        } catch (err) {
            console.error(`Trendyol scrape error (page ${page}):`, err);
        }
    }

    return Array.from(sellers.values());
}

/**
 * Enrich sellers with Google Places data (phone, address, rating)
 */
async function enrichWithGoogle(sellers: TrendyolSeller[]): Promise<TrendyolSeller[]> {
    if (!GOOGLE_MAPS_API_KEY) return sellers;

    const enriched: TrendyolSeller[] = [];

    for (const seller of sellers) {
        try {
            // Search Google Places for the seller
            const searchQuery = `${seller.sellerName} Trendyol mağaza`;
            
            const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
                    "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.rating,places.userRatingCount"
                },
                body: JSON.stringify({
                    textQuery: searchQuery,
                    languageCode: "tr",
                    maxResultCount: 3
                })
            });

            if (response.ok) {
                const data = await response.json();
                const places = data.places || [];
                
                if (places.length > 0) {
                    const bestMatch = places[0];
                    seller.phone = bestMatch.nationalPhoneNumber || bestMatch.internationalPhoneNumber || null;
                    seller.website = bestMatch.websiteUri || null;
                    seller.address = bestMatch.formattedAddress || null;
                    seller.google_place_id = bestMatch.id || null;
                    seller.google_maps_url = bestMatch.googleMapsUri || null;
                    seller.google_rating = bestMatch.rating || null;
                    seller.google_review_count = bestMatch.userRatingCount || null;
                    seller.email_missing = true;
                }
            }

            // Rate limit Google API calls
            await new Promise(resolve => setTimeout(resolve, 300));

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
        const { category, customQuery, enrich = true } = body;

        let searchQuery = "";
        let categoryLabel = "";

        if (category === "custom" && customQuery) {
            searchQuery = customQuery;
            categoryLabel = `Özel: ${customQuery}`;
        } else if (category && TRENDYOL_CATEGORIES[category]) {
            searchQuery = TRENDYOL_CATEGORIES[category].label;
            categoryLabel = TRENDYOL_CATEGORIES[category].label;
        } else {
            return NextResponse.json({ error: "Geçerli bir kategori veya arama terimi gerekli" }, { status: 400 });
        }

        // Step 1: Scrape Trendyol for sellers
        let sellers = await scrapeTrendyolSellers(searchQuery, 2);

        if (sellers.length === 0) {
            // Fallback: try alternative search terms
            const altQueries = [
                searchQuery + " satıcı",
                searchQuery + " mağaza",
            ];
            for (const altQ of altQueries) {
                sellers = await scrapeTrendyolSellers(altQ, 1);
                if (sellers.length > 0) break;
            }
        }

        // Step 2: Optionally enrich with Google Places data
        if (enrich && sellers.length > 0) {
            // Limit enrichment to first 20 sellers to control API costs
            const toEnrich = sellers.slice(0, 20);
            const remaining = sellers.slice(20);
            const enrichedSellers = await enrichWithGoogle(toEnrich);
            sellers = [...enrichedSellers, ...remaining];
        }

        // Log the discovery
        const adminDb = createAdminClient();
        await adminDb.from("lead_discovery_logs").insert({
            sector_id: null,
            city: "Trendyol",
            district: categoryLabel,
            query_used: `trendyol:${searchQuery}`,
            results_count: sellers.length,
            api_calls_used: enrich ? Math.min(sellers.length, 20) + 2 : 2,
            created_by: user.id
        });

        return NextResponse.json({
            success: true,
            count: sellers.length,
            category: categoryLabel,
            sellers
        });

    } catch (error: any) {
        console.error("Trendyol lead discovery error:", error);
        return NextResponse.json({ error: error.message || "Beklenmeyen hata" }, { status: 500 });
    }
}
