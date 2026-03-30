"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTrendyolCredentials } from "@/lib/trendyol/credentials";
import { getShipmentPackages, type TrendyolOrder } from "@/lib/trendyol/client";

export async function getTenantTrendyolData(tenantId: string) {
    const supabase = createAdminClient();

    // Toplam ürün
    const { count: totalProducts } = await supabase
        .from("trendyol_products")
        .select("*", { count: "exact", head: true })
        .eq("business_id", tenantId)
        .eq("is_active", true);

    // Cevaplanan toplam soru
    const { count: answeredQuestions } = await supabase
        .from("trendyol_questions")
        .select("*", { count: "exact", head: true })
        .eq("business_id", tenantId)
        .eq("status", "answered");

    // Bu ayki cevaplanan soru
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: monthlyAnswered } = await supabase
        .from("trendyol_questions")
        .select("*", { count: "exact", head: true })
        .eq("business_id", tenantId)
        .eq("status", "answered")
        .gte("created_at", startOfMonth.toISOString());

    // Stok alarmları (notifications tablosundan)
    const { count: stockAlerts } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .in("type", ["TRENDYOL_STOCK_WARNING", "TRENDYOL_STOCK_CRITICAL"]);

    // Son cevaplanan sorular (son 50 tane)
    const { data: recentQuestions } = await supabase
        .from("trendyol_questions")
        .select("*")
        .eq("business_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(50);

    return {
        totalProducts: totalProducts || 0,
        answeredQuestions: answeredQuestions || 0,
        monthlyAnswered: monthlyAnswered || 0,
        stockAlerts: stockAlerts || 0,
        recentQuestions: recentQuestions || [],
    };
}

export interface FetchOrdersParams {
    status?: string;
    startDate?: number;
    endDate?: number;
    page?: number;
    orderNumber?: string;
}

export interface OrdersResponse {
    orders: TrendyolOrder[];
    totalElements: number;
    error?: string;
}

export async function fetchTrendyolOrders(params: FetchOrdersParams = {}): Promise<OrdersResponse> {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return { orders: [], totalElements: 0, error: "Oturum bulunamadı" };

        const { data: member } = await supabase
            .from("tenant_members")
            .select("tenant_id")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();

        if (!member?.tenant_id) return { orders: [], totalElements: 0, error: "Tenant bulunamadı" };

        const creds = await getTrendyolCredentials(member.tenant_id);
        if (!creds) return { orders: [], totalElements: 0, error: "Trendyol bağlantısı bulunamadı" };

        // Sipariş numarası ile arama yapılıyorsa tek çağrı yeterli
        if (params.orderNumber) {
            const now = Date.now();
            const threeMonthsAgo = now - 90 * 24 * 60 * 60 * 1000;

            // Sipariş numarasıyla arama yaparken tarih aralığını 2 haftalık pencerelere böl
            const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000;
            const allOrders: any[] = [];

            for (let windowEnd = now; windowEnd > threeMonthsAgo; windowEnd -= TWO_WEEKS) {
                const windowStart = Math.max(windowEnd - TWO_WEEKS, threeMonthsAgo);
                try {
                    const result = await getShipmentPackages(creds, {
                        orderNumber: params.orderNumber,
                        startDate: windowStart,
                        endDate: windowEnd,
                        page: 0,
                        size: 50,
                    });
                    if (result.content?.length > 0) {
                        allOrders.push(...result.content);
                        break; // Bulundu, çık
                    }
                } catch { continue; }
                await new Promise(r => setTimeout(r, 50));
            }

            const enriched = await enrichOrdersWithImages(allOrders, member.tenant_id);
            return { orders: enriched, totalElements: allOrders.length };
        }

        // Trendyol API max 2 haftalık aralık destekler.
        // Son 3.5 ayı kapsamak için 2 haftalık pencerelerle çoklu çağrı yapıyoruz.
        const now = Date.now();
        const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000;
        const TOTAL_WINDOWS = 7; // ~3.5 ay

        const allOrders: any[] = [];
        const seenOrderNumbers = new Set<string>();

        for (let i = 0; i < TOTAL_WINDOWS; i++) {
            const windowEnd = now - (i * TWO_WEEKS);
            const windowStart = windowEnd - TWO_WEEKS;

            try {
                // Her pencere için tüm sayfaları çek
                let page = 0;
                let hasMore = true;

                while (hasMore) {
                    const result = await getShipmentPackages(creds, {
                        status: params.status || undefined,
                        startDate: windowStart,
                        endDate: windowEnd,
                        page,
                        size: 200, // Trendyol max 200
                    });

                    for (const order of result.content || []) {
                        if (!seenOrderNumbers.has(order.orderNumber)) {
                            seenOrderNumbers.add(order.orderNumber);
                            allOrders.push(order);
                        }
                    }

                    // Daha fazla sayfa var mı?
                    const fetched = (page + 1) * 200;
                    hasMore = fetched < result.totalElements;
                    page++;

                    // Rate limit koruması
                    if (hasMore) {
                        await new Promise(r => setTimeout(r, 100));
                    }
                }
            } catch (e) {
                // Bir pencere başarısız olursa devam et
                console.warn(`Trendyol sipariş penceresi ${i} hatası:`, e);
                continue;
            }

            // Rate limit koruması
            if (i < TOTAL_WINDOWS - 1) {
                await new Promise(r => setTimeout(r, 100));
            }
        }

        // Tarihe göre sırala (en yeni önce)
        allOrders.sort((a, b) => (b.orderDate || 0) - (a.orderDate || 0));

        // Client-side pagination (sayfa başına 50)
        const pageSize = 50;
        const currentPage = params.page || 0;
        const startIdx = currentPage * pageSize;
        const paginatedOrders = allOrders.slice(startIdx, startIdx + pageSize);

        // Görselleri ekle
        const enriched = await enrichOrdersWithImages(paginatedOrders, member.tenant_id);

        return {
            orders: enriched,
            totalElements: allOrders.length,
        };
    } catch (error: any) {
        console.error("Trendyol sipariş çekme hatası:", error);
        return {
            orders: [],
            totalElements: 0,
            error: error.message || "Siparişler yüklenirken bir hata oluştu",
        };
    }
}

/**
 * Sipariş satırlarına ürün görsellerini ekler (barkod eşleşmesi ile)
 */
async function enrichOrdersWithImages(orders: any[], tenantId: string): Promise<any[]> {
    const allBarcodes = new Set<string>();
    for (const order of orders) {
        for (const line of order.lines || []) {
            if (line.barcode) allBarcodes.add(line.barcode);
        }
    }

    let imageMap: Record<string, string> = {};
    if (allBarcodes.size > 0) {
        const adminSupabase = createAdminClient();
        const { data: products } = await adminSupabase
            .from("trendyol_products")
            .select("barcode, images")
            .eq("business_id", tenantId)
            .in("barcode", Array.from(allBarcodes));

        if (products) {
            for (const p of products) {
                if (p.barcode && p.images) {
                    const imgs = typeof p.images === "string" ? JSON.parse(p.images) : p.images;
                    if (Array.isArray(imgs) && imgs.length > 0) {
                        const firstImg = imgs[0];
                        imageMap[p.barcode] = typeof firstImg === "string" ? firstImg : firstImg?.url || "";
                    }
                }
            }
        }
    }

    return orders.map((order: any) => ({
        ...order,
        lines: (order.lines || []).map((line: any) => ({
            ...line,
            imageUrl: line.barcode ? imageMap[line.barcode] || "" : "",
        })),
    }));
}

/**
 * Sidebar badge için yeni (Created) sipariş sayısını döndürür.
 * Trendyol API'yi çağırır, son 14 günlük "Created" status siparişleri sayar.
 */
export async function getTrendyolNewOrderCount(): Promise<number> {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return 0;

        const { data: member } = await supabase
            .from("tenant_members")
            .select("tenant_id")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();

        if (!member?.tenant_id) return 0;

        const creds = await getTrendyolCredentials(member.tenant_id);
        if (!creds) return 0;

        const now = Date.now();
        const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

        const result = await getShipmentPackages(creds, {
            status: "Created",
            startDate: twoWeeksAgo,
            endDate: now,
            page: 0,
            size: 1, // Sadece sayıya ihtiyacımız var
        });

        return result.totalElements || 0;
    } catch (error) {
        console.error("Trendyol yeni sipariş sayısı hatası:", error);
        return 0;
    }
}
