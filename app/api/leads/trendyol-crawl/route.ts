import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300; // 5 min timeout for crawling

/**
 * Trendyol Puppeteer Crawler - LOCAL ONLY
 * Uses a headless browser to crawl Trendyol category pages
 * and extract unique seller/store names automatically.
 */
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
        const { category, customUrl, maxPages = 5 } = body;

        // Dynamically import puppeteer (only available locally)
        let puppeteer;
        try {
            puppeteer = await import("puppeteer");
        } catch {
            return NextResponse.json({
                error: "Puppeteer yüklü değil. Bu modül sadece lokal ortamda çalışır. 'npm install puppeteer' komutunu çalıştırın."
            }, { status: 500 });
        }

        // Category URL mapping
        const categoryUrls: Record<string, { label: string; url: string }> = {
            "kadin-giyim": {
                label: "Kadın Giyim",
                url: "https://www.trendyol.com/kadin-giyim-x-g1-c82"
            },
            "erkek-giyim": {
                label: "Erkek Giyim",
                url: "https://www.trendyol.com/erkek-giyim-x-g2-c114"
            },
            "elektronik": {
                label: "Elektronik",
                url: "https://www.trendyol.com/elektronik-x-c73"
            },
            "kozmetik": {
                label: "Kozmetik",
                url: "https://www.trendyol.com/kozmetik-x-c56"
            },
            "ev-yasam": {
                label: "Ev & Yaşam",
                url: "https://www.trendyol.com/ev-yasam-x-c76"
            },
            "ayakkabi-canta": {
                label: "Ayakkabı & Çanta",
                url: "https://www.trendyol.com/ayakkabi-canta-x-c12"
            },
            "spor-outdoor": {
                label: "Spor & Outdoor",
                url: "https://www.trendyol.com/spor-outdoor-x-c75"
            },
            "anne-bebek": {
                label: "Anne & Bebek",
                url: "https://www.trendyol.com/anne-bebek-x-c2"
            },
            "saat-aksesuar": {
                label: "Saat & Aksesuar",
                url: "https://www.trendyol.com/saat-aksesuar-x-c15"
            },
            "supermarket": {
                label: "Süpermarket",
                url: "https://www.trendyol.com/supermarket-x-c77"
            }
        };

        let startUrl = "";
        let categoryLabel = "";

        if (category === "custom" && customUrl) {
            startUrl = customUrl;
            categoryLabel = "Özel URL";
        } else if (category && categoryUrls[category]) {
            startUrl = categoryUrls[category].url;
            categoryLabel = categoryUrls[category].label;
        } else {
            return NextResponse.json({ error: "Kategori seçin veya URL girin" }, { status: 400 });
        }

        console.log(`[Trendyol Crawler] Starting crawl: ${categoryLabel} - ${startUrl} (${maxPages} pages)`);

        // Launch browser
        const browser = await puppeteer.default.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-web-security",
                "--disable-features=VizDisplayCompositor"
            ]
        });

        const sellers = new Map<string, { sellerId: string; sellerName: string; storeUrl: string }>();

        try {
            const page = await browser.newPage();

            // Set user agent to look like a real browser
            await page.setUserAgent(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            );

            // Set viewport
            await page.setViewport({ width: 1920, height: 1080 });

            // Block images and fonts to speed up crawling
            await page.setRequestInterception(true);
            page.on("request", (request: any) => {
                const type = request.resourceType();
                if (["image", "font", "media"].includes(type)) {
                    request.abort();
                } else {
                    request.continue();
                }
            });

            for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
                const pageUrl = pageNum === 1
                    ? startUrl
                    : `${startUrl}?pi=${pageNum}`;

                console.log(`[Trendyol Crawler] Page ${pageNum}/${maxPages}: ${pageUrl}`);

                try {
                    await page.goto(pageUrl, {
                        waitUntil: "domcontentloaded",
                        timeout: 30000
                    });

                    // Wait for product cards to appear
                    await page.waitForSelector(".p-card-wrppr, .product-card", { timeout: 10000 }).catch(() => {
                        console.log(`[Trendyol Crawler] No product cards found on page ${pageNum}`);
                    });

                    // Scroll down to load lazy-loaded products
                    await autoScroll(page);

                    // Extract seller names from product cards
                    const pageSellers = await page.evaluate(() => {
                        const results: Array<{ sellerId: string; sellerName: string; storeUrl: string }> = [];

                        // Method 1: Product card brand names
                        document.querySelectorAll(".product-card, .p-card-wrppr a").forEach((card) => {
                            const nameEl = card.querySelector(".prdct-desc-cntnr-ttl") ||
                                card.querySelector(".prdct-desc-cntnr-name") ||
                                card.querySelector("h2 span, h3 span");

                            if (nameEl) {
                                const name = (nameEl.textContent || "").trim();
                                if (name && name.length > 1) {
                                    const href = (card as HTMLAnchorElement).getAttribute("href") || "";
                                    const midMatch = href.match(/merchantId=(\d+)/);
                                    const mid = midMatch ? midMatch[1] : "";
                                    const q = encodeURIComponent(name);

                                    results.push({
                                        sellerId: mid || name,
                                        sellerName: name,
                                        storeUrl: `https://www.trendyol.com/sr?q=${q}&qt=${q}&st=${q}&os=1`
                                    });
                                }
                            }
                        });

                        // Method 2: Sponsored seller links
                        document.querySelectorAll('.seller-name, a[href*="/magaza/"]').forEach((a) => {
                            const name = (a.textContent || "").trim();
                            const href = (a as HTMLAnchorElement).getAttribute("href") || "";
                            const mMatch = href.match(/-m-(\d+)/);

                            if (name && name.length > 1 && mMatch) {
                                results.push({
                                    sellerId: mMatch[1],
                                    sellerName: name,
                                    storeUrl: href.startsWith("http") ? href : `https://www.trendyol.com${href.split("?")[0]}`
                                });
                            }
                        });

                        return results;
                    });

                    // Add to unique sellers map (deduplicate by name, case-insensitive)
                    for (const s of pageSellers) {
                        const nameKey = s.sellerName.toUpperCase().trim();
                        if (!sellers.has(nameKey)) {
                            sellers.set(nameKey, s);
                        } else if (s.sellerId && s.sellerId !== s.sellerName) {
                            // If we already have this seller but without a merchantId, prefer the one with merchantId
                            const existing = sellers.get(nameKey)!;
                            if (existing.sellerId === existing.sellerName) {
                                sellers.set(nameKey, s);
                            }
                        }
                    }

                    console.log(`[Trendyol Crawler] Page ${pageNum}: Found ${pageSellers.length} sellers (unique total: ${sellers.size})`);

                    // Wait between pages to avoid rate limits
                    if (pageNum < maxPages) {
                        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
                    }

                } catch (pageErr: any) {
                    console.error(`[Trendyol Crawler] Error on page ${pageNum}:`, pageErr.message);
                }
            }

        } finally {
            await browser.close();
        }

        const sellerList = Array.from(sellers.values());
        console.log(`[Trendyol Crawler] Done! Total unique sellers: ${sellerList.length}`);

        return NextResponse.json({
            success: true,
            count: sellerList.length,
            category: categoryLabel,
            url: startUrl,
            pagesScanned: maxPages,
            sellers: sellerList
        });

    } catch (error: any) {
        console.error("[Trendyol Crawler] Fatal error:", error);
        return NextResponse.json({
            error: error.message || "Tarama sırasında bir hata oluştu"
        }, { status: 500 });
    }
}

/**
 * Auto-scroll the page to trigger lazy-loading of product cards
 */
async function autoScroll(page: any) {
    await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
            let totalHeight = 0;
            const distance = 400;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight - window.innerHeight || totalHeight > 15000) {
                    clearInterval(timer);
                    resolve();
                }
            }, 150);
        });
    });
}
