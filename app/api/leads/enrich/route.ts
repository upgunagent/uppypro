import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// ========================== PHASE 1: Static Path Scanning ==========================
// Extensive list of contact page paths used by Turkish businesses
const CONTACT_PATHS = [
    // Direct paths
    "/iletisim",
    "/contact",
    "/bize-ulasin",
    "/hakkimizda",
    "/about",
    "/about-us",
    "/contact-us",
    "/bize-ulasın",
    "/kunye",
    // Shopify patterns
    "/pages/iletisim",
    "/pages/contact",
    "/pages/bize-ulasin",
    "/pages/hakkimizda",
    "/pages/about",
    "/pages/kunye",
    // WordPress patterns
    "/iletisim/",
    "/contact/",
    "/bize-ulasin/",
    // Wix patterns
    "/iletişim",
    "/iletişim-1",
    // Common Turkish variations
    "/tr/iletisim",
    "/tr/contact",
    "/tr/hakkimizda",
    "/kurumsal/iletisim",
    "/kurumsal",
    "/sayfa/iletisim",
    "/sayfa/bize-ulasin",
    // Other CMS patterns
    "/index.php/iletisim",
    "/index.php/contact",
    "/wp/iletisim",
    "/wp/contact",
    // Footer/Misc
    "/footer",
    "/site-haritasi",
];

// Contact-related keywords for dynamic link discovery
const CONTACT_KEYWORDS = [
    "iletisim", "iletişim", "contact", "bize-ulasin", "bize-ulasın",
    "bize ulaşın", "bize ulasin", "hakkimizda", "hakkımızda", "about",
    "kunye", "künye", "ulasin", "ulaşın", "reach", "get-in-touch",
    "adres", "konum", "location", "franchise", "bayilik"
];

// Email regex - catches most valid email addresses
const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// Obfuscated email patterns
const OBFUSCATED_PATTERNS = [
    // [at] or (at) or {at} patterns
    /([a-zA-Z0-9._%+\-]+)\s*[\[\(\{]\s*(?:at|@|&#64;)\s*[\]\)\}]\s*([a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi,
    // [dot] or (dot) patterns
    /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+)\s*[\[\(\{]\s*(?:dot|\.)\s*[\]\)\}]\s*([a-zA-Z]{2,})/gi,
    // HTML entity &#64; for @
    /([a-zA-Z0-9._%+\-]+)&#64;([a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g,
    // Spaced out email: info @ domain . com
    /([a-zA-Z0-9._%+\-]+)\s+@\s+([a-zA-Z0-9.\-]+\s*\.\s*[a-zA-Z]{2,})/g,
];

// Blacklisted email patterns (not real business emails)
const BLACKLISTED_PATTERNS = [
    /^(example|test|demo|root|noreply|no-reply|mailer-daemon|postmaster|webmaster@w3)/i,
    /@(example\.com|test\.com|sentry\.io|wixpress\.com|w3\.org|schema\.org|googleapis\.com|google\.com|facebook\.com|instagram\.com|twitter\.com|wordpress\.com|wp\.com|cloudflare\.com|jquery\.com|bootstrapcdn\.com|fontawesome\.com|gstatic\.com|gravatar\.com|jsdelivr\.net|unpkg\.com|cdnjs\.com|maxcdn\.com|typekit\.net|shopify\.com|myshopify\.com|squarespace\.com)/i,
    /\.(png|jpg|jpeg|gif|svg|css|js|pdf|doc|webp|woff|woff2|ttf|eot)$/i,
    /^[0-9]+@/,
    /@.*\.(png|jpg|jpeg|gif|svg)$/i,
];

// Priority scoring for email addresses
function scoreEmail(email: string): number {
    const lower = email.toLowerCase();
    let score = 10; // Base score

    // Preferred prefixes (business contact emails)
    if (/^(info|iletisim|contact|bilgi)@/i.test(lower)) score += 50;
    if (/^(rezervasyon|randevu|siparis|appointment|booking)@/i.test(lower)) score += 45;
    if (/^(hello|merhaba|destek|support|satis|sales)@/i.test(lower)) score += 30;

    // Slightly prefer domain emails, but do NOT exclude free providers
    if (!/@(gmail|hotmail|yahoo|outlook|yandex|icloud)\./i.test(lower)) score += 5;

    // Prefer shorter local parts
    if (lower.split("@")[0].length <= 10) score += 5;

    // Penalize very long emails (likely auto-generated)
    if (lower.length > 40) score -= 20;

    return score;
}

function isBlacklisted(email: string): boolean {
    return BLACKLISTED_PATTERNS.some(pattern => pattern.test(email));
}

// ========================== PHASE 2: Fetch & Extract ==========================

async function fetchPage(url: string): Promise<string | null> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
                "Accept-Encoding": "identity",
                "Cache-Control": "no-cache",
            },
            redirect: "follow",
        });

        clearTimeout(timeout);

        if (!response.ok) return null;

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("text/html") && !contentType.includes("text/plain") && !contentType.includes("application/json")) return null;

        return await response.text();
    } catch {
        return null;
    }
}

function extractEmailsFromHTML(html: string): string[] {
    const emails: Set<string> = new Set();

    // 1. Standard email regex
    const standardMatches = html.match(EMAIL_REGEX) || [];
    standardMatches.forEach(e => emails.add(e.toLowerCase()));

    // 2. mailto: links
    const mailtoRegex = /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi;
    let match;
    while ((match = mailtoRegex.exec(html)) !== null) {
        emails.add(match[1].toLowerCase());
    }

    // 3. Obfuscated patterns
    for (const pattern of OBFUSCATED_PATTERNS) {
        pattern.lastIndex = 0;
        while ((match = pattern.exec(html)) !== null) {
            const reconstructed = `${match[1]}@${match[2]}`.replace(/\s/g, "").toLowerCase();
            if (EMAIL_REGEX.test(reconstructed)) {
                emails.add(reconstructed);
            }
        }
    }

    // 4. HTML decoded entities - decode common ones first then re-scan
    const decoded = html
        .replace(/&#64;/g, "@")
        .replace(/&#46;/g, ".")
        .replace(/&#x40;/g, "@")
        .replace(/&#x2e;/g, ".")
        .replace(/&commat;/g, "@")
        .replace(/\[at\]/gi, "@")
        .replace(/\(at\)/gi, "@")
        .replace(/\{at\}/gi, "@")
        .replace(/\[dot\]/gi, ".")
        .replace(/\(dot\)/gi, ".")
        .replace(/\{dot\}/gi, ".");

    const decodedMatches = decoded.match(EMAIL_REGEX) || [];
    decodedMatches.forEach(e => emails.add(e.toLowerCase()));

    // 5. Check data attributes (data-email, data-mail, etc.)
    const dataAttrRegex = /data-(?:email|mail|e-mail|contact)[=:]["']([^"']+)["']/gi;
    while ((match = dataAttrRegex.exec(html)) !== null) {
        const val = match[1].trim();
        if (EMAIL_REGEX.test(val)) {
            emails.add(val.toLowerCase());
        }
    }

    // 6. JSON-LD structured data
    const jsonLdRegex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    while ((match = jsonLdRegex.exec(html)) !== null) {
        try {
            const jsonStr = match[1];
            const emailsInJson = jsonStr.match(EMAIL_REGEX) || [];
            emailsInJson.forEach(e => emails.add(e.toLowerCase()));
        } catch { /* ignore JSON parse errors */ }
    }

    // 7. Check for "E:" or "Email:" or "E-posta:" patterns nearby
    const labeledEmailRegex = /(?:e-posta|e[\s-]*mail|eposta|email|e\s*:)\s*[:=]?\s*([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi;
    while ((match = labeledEmailRegex.exec(decoded)) !== null) {
        emails.add(match[1].toLowerCase());
    }

    // Filter blacklisted
    return Array.from(emails).filter(e => !isBlacklisted(e));
}

// ========================== PHASE 3: Dynamic Link Discovery ==========================

function discoverContactLinks(html: string, baseUrl: string): string[] {
    const links: Set<string> = new Set();
    const baseUrlObj = new URL(baseUrl);

    // Find all <a> tags
    const linkRegex = /<a[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
        const href = match[1].trim();
        const linkText = match[2].replace(/<[^>]*>/g, "").trim().toLowerCase();
        const hrefLower = href.toLowerCase();

        // Check if href or link text contains contact-related keywords
        const isContactLink = CONTACT_KEYWORDS.some(keyword =>
            hrefLower.includes(keyword) || linkText.includes(keyword)
        );

        if (isContactLink) {
            try {
                let fullUrl: string;
                if (href.startsWith("http")) {
                    // Check it's same domain
                    const linkUrl = new URL(href);
                    if (linkUrl.hostname !== baseUrlObj.hostname) continue;
                    fullUrl = href;
                } else if (href.startsWith("/")) {
                    fullUrl = `${baseUrlObj.origin}${href}`;
                } else {
                    fullUrl = `${baseUrl}/${href}`;
                }

                // Clean URL
                fullUrl = fullUrl.split("?")[0].split("#")[0];
                links.add(fullUrl);
            } catch { /* ignore invalid URLs */ }
        }
    }

    // Also check navigation menus (<nav> elements)
    const navRegex = /<nav[^>]*>([\s\S]*?)<\/nav>/gi;
    while ((match = navRegex.exec(html)) !== null) {
        const navHtml = match[1];
        const navLinkRegex = /href\s*=\s*["']([^"'#]+)["']/gi;
        let navMatch;
        while ((navMatch = navLinkRegex.exec(navHtml)) !== null) {
            const href = navMatch[1].trim();
            const hrefLower = href.toLowerCase();

            if (CONTACT_KEYWORDS.some(kw => hrefLower.includes(kw))) {
                try {
                    let fullUrl: string;
                    if (href.startsWith("http")) {
                        fullUrl = href;
                    } else if (href.startsWith("/")) {
                        fullUrl = `${baseUrlObj.origin}${href}`;
                    } else {
                        fullUrl = `${baseUrl}/${href}`;
                    }
                    fullUrl = fullUrl.split("?")[0].split("#")[0];
                    links.add(fullUrl);
                } catch { /* ignore */ }
            }
        }
    }

    return Array.from(links);
}

// ========================== PHASE 4: Deep Search ==========================

async function deepSearchEmails(baseUrl: string): Promise<string[]> {
    const allEmails: string[] = [];
    const visitedUrls: Set<string> = new Set();

    // STEP 1: Fetch main page
    const mainPageHtml = await fetchPage(baseUrl);
    if (!mainPageHtml) {
        // Try with www
        const wwwUrl = baseUrl.replace("://", "://www.");
        const wwwHtml = await fetchPage(wwwUrl);
        if (wwwHtml) {
            const emails = extractEmailsFromHTML(wwwHtml);
            allEmails.push(...emails);
        }
        return [...new Set(allEmails)];
    }

    visitedUrls.add(baseUrl);
    const mainPageEmails = extractEmailsFromHTML(mainPageHtml);
    allEmails.push(...mainPageEmails);

    // STEP 2: Discover contact page links from main page HTML
    const discoveredLinks = discoverContactLinks(mainPageHtml, baseUrl);

    // STEP 3: Try discovered links first (highest priority)
    for (const link of discoveredLinks.slice(0, 5)) { // Max 5 discovered links
        if (visitedUrls.has(link)) continue;
        visitedUrls.add(link);

        await new Promise(r => setTimeout(r, 300)); // Polite delay
        const html = await fetchPage(link);
        if (html) {
            const emails = extractEmailsFromHTML(html);
            allEmails.push(...emails);
            if (allEmails.length > 0) break; // Found emails, stop
        }
    }

    // STEP 4: If still no emails, try static paths
    if (allEmails.length === 0) {
        for (const path of CONTACT_PATHS) {
            const targetUrl = `${baseUrl}${path}`;
            if (visitedUrls.has(targetUrl)) continue;
            visitedUrls.add(targetUrl);

            await new Promise(r => setTimeout(r, 300));
            const html = await fetchPage(targetUrl);
            if (html) {
                const emails = extractEmailsFromHTML(html);
                allEmails.push(...emails);
                if (allEmails.length > 0) break;
            }

            // Limit to 8 extra path attempts
            if (visitedUrls.size > 10) break;
        }
    }

    // STEP 5: If still no emails, try Google search as last resort
    if (allEmails.length === 0) {
        try {
            const domain = new URL(baseUrl).hostname;
            // Try fetching robots.txt or sitemap for more URLs
            const sitemapHtml = await fetchPage(`${baseUrl}/sitemap.xml`);
            if (sitemapHtml) {
                const sitemapUrls: string[] = [];
                const urlRegex = /<loc>([^<]+)<\/loc>/g;
                let urlMatch;
                while ((urlMatch = urlRegex.exec(sitemapHtml)) !== null) {
                    const url = urlMatch[1];
                    if (CONTACT_KEYWORDS.some(kw => url.toLowerCase().includes(kw))) {
                        sitemapUrls.push(url);
                    }
                }

                for (const sUrl of sitemapUrls.slice(0, 3)) {
                    if (visitedUrls.has(sUrl)) continue;
                    visitedUrls.add(sUrl);
                    await new Promise(r => setTimeout(r, 300));
                    const html = await fetchPage(sUrl);
                    if (html) {
                        const emails = extractEmailsFromHTML(html);
                        allEmails.push(...emails);
                        if (allEmails.length > 0) break;
                    }
                }
            }
        } catch { /* ignore */ }
    }

    return [...new Set(allEmails)];
}

// ========================== MAIN ==========================

function normalizeUrl(website: string): string {
    let url = website.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
    }
    return url.replace(/\/+$/, "");
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
        const { leadIds } = body;

        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
            return NextResponse.json({ error: "leadIds (array) gerekli" }, { status: 400 });
        }

        if (leadIds.length > 50) {
            return NextResponse.json({ error: "En fazla 50 lead aynı anda zenginleştirilebilir" }, { status: 400 });
        }

        const adminDb = createAdminClient();

        const { data: leads, error: fetchError } = await adminDb
            .from("leads")
            .select("id, business_name, website, email, email_missing")
            .in("id", leadIds);

        if (fetchError || !leads) {
            return NextResponse.json({ error: "Lead'ler bulunamadı" }, { status: 404 });
        }

        const results: { id: string; business_name: string; email: string | null; status: string; urls_checked?: number }[] = [];

        for (const lead of leads) {
            // Skip if already has email
            if (lead.email && !lead.email_missing) {
                results.push({ id: lead.id, business_name: lead.business_name, email: lead.email, status: "already_has_email" });
                continue;
            }

            // Skip if no website
            if (!lead.website) {
                results.push({ id: lead.id, business_name: lead.business_name, email: null, status: "no_website" });
                continue;
            }

            const baseUrl = normalizeUrl(lead.website);

            // Deep search with all strategies
            const uniqueEmails = await deepSearchEmails(baseUrl);

            if (uniqueEmails.length === 0) {
                results.push({ id: lead.id, business_name: lead.business_name, email: null, status: "not_found" });
                continue;
            }

            // Score and pick the best email
            const scored = uniqueEmails.map(e => ({ email: e, score: scoreEmail(e) }));
            scored.sort((a, b) => b.score - a.score);
            const bestEmail = scored[0].email;

            // Update lead
            await adminDb
                .from("leads")
                .update({
                    email: bestEmail,
                    email_missing: false,
                    enrichment_data: {
                        all_emails_found: uniqueEmails,
                        enriched_from: baseUrl,
                        enriched_at: new Date().toISOString(),
                        method: "deep_search_v2"
                    },
                    enriched_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq("id", lead.id);

            // Audit log
            await adminDb.from("lead_audit_logs").insert({
                action: "enrich",
                entity_type: "lead",
                entity_id: lead.id,
                details: {
                    email_found: bestEmail,
                    all_emails: uniqueEmails,
                    source_url: baseUrl
                },
                performed_by: user.id
            });

            results.push({ id: lead.id, business_name: lead.business_name, email: bestEmail, status: "found" });
        }

        const summary = {
            total: results.length,
            found: results.filter(r => r.status === "found").length,
            already_has: results.filter(r => r.status === "already_has_email").length,
            not_found: results.filter(r => r.status === "not_found").length,
            no_website: results.filter(r => r.status === "no_website").length,
        };

        return NextResponse.json({ success: true, summary, results });

    } catch (error: any) {
        console.error("Lead enrich error:", error);
        return NextResponse.json({ error: error.message || "Beklenmeyen hata" }, { status: 500 });
    }
}
