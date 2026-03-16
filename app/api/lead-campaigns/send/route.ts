import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

// Kampanya mailleri için ayrı Resend hesabı (marketing@upgunai.com)
// Sistem mailleri (şifre sıfırlama, randevu, abonelik) hâlâ RESEND_API_KEY ile gider
const resend = new Resend(process.env.RESEND_CAMPAIGN_API_KEY || process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.LEAD_CAMPAIGN_FROM_EMAIL || "UPGUN AI <marketing@upgunai.com>";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.upgunai.com";
const DAILY_LIMIT = parseInt(process.env.LEAD_DAILY_SEND_LIMIT || "100");
const SEND_INTERVAL = parseInt(process.env.LEAD_SEND_INTERVAL_MS || "5000");
const COOLDOWN_DAYS = parseInt(process.env.LEAD_COOLDOWN_DAYS || "7");

// Add tracking pixel to HTML (before </body>)
function addTrackingPixel(html: string, sendId: string): string {
    const pixel = `<img src="${BASE_URL}/api/leads/track/open?id=${sendId}" width="1" height="1" style="display:none" alt="" />`;
    if (html.includes("</body>")) {
        return html.replace("</body>", `${pixel}</body>`);
    }
    return html + pixel;
}

// Wrap all href links with click tracking proxy
function wrapLinksWithTracking(html: string, sendId: string): string {
    // Match href="..." but skip tracking URLs, mailto:, and # anchors
    return html.replace(
        /href="(https?:\/\/[^"]+)"/gi,
        (match, url) => {
            // Don't wrap our own tracking URLs
            if (url.includes("/api/leads/track/")) return match;
            const trackedUrl = `${BASE_URL}/api/leads/track/click?id=${sendId}&url=${encodeURIComponent(url)}`;
            return `href="${trackedUrl}"`;
        }
    );
}

// Add unsubscribe footer to HTML
function addUnsubscribeFooter(html: string, email: string, sendId: string): string {
    const token = Buffer.from(`${email}|${sendId}`).toString("base64");
    const unsubUrl = `${BASE_URL}/api/leads/unsubscribe?token=${token}`;
    const footer = `
<div style="text-align:center;padding:20px 0 10px;margin-top:20px;border-top:1px solid #eee;font-size:12px;color:#999;">
  Bu e-postayı almak istemiyorsanız <a href="${unsubUrl}" style="color:#999;text-decoration:underline;">abonelikten çıkabilirsiniz</a>.
</div>`;

    if (html.includes("</body>")) {
        return html.replace("</body>", `${footer}</body>`);
    }
    return html + footer;
}

export async function POST(req: NextRequest) {
    try {
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
        const { campaignName, templateId, subject, htmlContent, leadIds, skipCooldown } = body;

        if (!subject || !htmlContent || !leadIds || leadIds.length === 0) {
            return NextResponse.json({ error: "subject, htmlContent ve leadIds gerekli" }, { status: 400 });
        }

        const adminDb = createAdminClient();

        // Check daily send limit
        const today = new Date().toISOString().split("T")[0];
        const { count: todaySends } = await adminDb
            .from("lead_campaign_sends")
            .select("id", { count: "exact", head: true })
            .gte("sent_at", `${today}T00:00:00`)
            .lte("sent_at", `${today}T23:59:59`);

        const remainingQuota = DAILY_LIMIT - (todaySends || 0);
        if (remainingQuota <= 0) {
            return NextResponse.json({ error: `Günlük gönderim limiti (${DAILY_LIMIT}) doldu. Yarın tekrar deneyin.` }, { status: 429 });
        }

        // Create campaign record
        const { data: campaign, error: campaignError } = await adminDb
            .from("lead_campaigns")
            .insert({
                name: campaignName || `Kampanya - ${new Date().toLocaleDateString("tr-TR")}`,
                subject,
                html_content: htmlContent,
                status: "sending",
                total_count: Math.min(leadIds.length, remainingQuota),
                template_id: templateId || null,
                created_by: user.id,
            })
            .select("id")
            .single();

        if (campaignError) {
            return NextResponse.json({ error: `Kampanya oluşturulamadı: ${campaignError.message}` }, { status: 500 });
        }

        const campaignId = campaign.id;

        // Get lead details
        const { data: leads } = await adminDb
            .from("leads")
            .select("id, business_name, contact_name, email, phone, city, district, sector_name, website")
            .in("id", leadIds)
            .eq("email_missing", false)
            .not("email", "is", null);

        if (!leads || leads.length === 0) {
            await adminDb.from("lead_campaigns").update({ status: "failed" }).eq("id", campaignId);
            return NextResponse.json({ error: "E-posta adresi olan lead bulunamadı" }, { status: 400 });
        }

        // Filter out suppressed leads
        let suppressedEmails = new Set<string>();
        try {
            const { data: suppressions } = await adminDb
                .from("lead_suppressions")
                .select("email")
                .in("email", leads.map(l => l.email));
            suppressedEmails = new Set((suppressions || []).map(s => s.email));
        } catch { /* table may not exist yet */ }

        // Filter out recently contacted leads (UNLESS skipCooldown is true)
        let recentlySentIds = new Set<string>();
        if (!skipCooldown) {
            try {
                const cooldownDate = new Date();
                cooldownDate.setDate(cooldownDate.getDate() - COOLDOWN_DAYS);
                const { data: recentSends } = await adminDb
                    .from("lead_campaign_sends")
                    .select("lead_id")
                    .in("lead_id", leads.map(l => l.id))
                    .gte("sent_at", cooldownDate.toISOString());
                recentlySentIds = new Set((recentSends || []).map(s => s.lead_id));
            } catch { /* ok */ }
        }

        const eligibleLeads = leads.filter(l =>
            !suppressedEmails.has(l.email) && !recentlySentIds.has(l.id)
        ).slice(0, remainingQuota);

        if (eligibleLeads.length === 0) {
            await adminDb.from("lead_campaigns").update({ status: "completed", sent_count: 0 }).eq("id", campaignId);
            return NextResponse.json({
                success: true,
                campaignId,
                sent: 0,
                skipped: leads.length,
                message: "Uygun lead bulunamadı"
            });
        }

        // Send emails with throttling
        let sentCount = 0;
        let failedCount = 0;
        const errors: string[] = [];

        for (let i = 0; i < eligibleLeads.length; i++) {
            const lead = eligibleLeads[i];

            try {
                // Personalize HTML & subject (replace all {{variable}} placeholders)
                const replacements: Record<string, string> = {
                    "firma_adi": lead.business_name || "",
                    "business_name": lead.business_name || "",
                    "yetkili_adi": lead.contact_name || "",
                    "contact_name": lead.contact_name || "",
                    "email": lead.email || "",
                    "telefon": lead.phone || "",
                    "phone": lead.phone || "",
                    "sehir": lead.city || "",
                    "city": lead.city || "",
                    "ilce": lead.district || "",
                    "district": lead.district || "",
                    "sektor": lead.sector_name || "",
                    "sector": lead.sector_name || "",
                    "website": lead.website || "",
                };

                let personalizedHtml = htmlContent;
                let personalizedSubject = subject;
                for (const [key, value] of Object.entries(replacements)) {
                    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "gi");
                    personalizedHtml = personalizedHtml.replace(regex, value);
                    personalizedSubject = personalizedSubject.replace(regex, value);
                }

                // Create send record FIRST to get the ID for tracking
                const { data: sendRecord, error: recordErr } = await adminDb
                    .from("lead_campaign_sends")
                    .insert({
                        campaign_id: campaignId,
                        lead_id: lead.id,
                        email: lead.email,
                        status: "pending",
                        sent_at: new Date().toISOString()
                    })
                    .select("id")
                    .single();

                if (recordErr || !sendRecord) {
                    throw new Error(`Send record oluşturulamadı: ${recordErr?.message}`);
                }

                const sendRecordId = sendRecord.id;

                // Add tracking pixel, wrap links, add unsubscribe footer
                personalizedHtml = addTrackingPixel(personalizedHtml, sendRecordId);
                personalizedHtml = wrapLinksWithTracking(personalizedHtml, sendRecordId);
                personalizedHtml = addUnsubscribeFooter(personalizedHtml, lead.email, sendRecordId);

                // Send email via Resend
                const { data: sendData, error: sendError } = await resend.emails.send({
                    from: FROM_EMAIL,
                    to: [lead.email],
                    subject: personalizedSubject,
                    html: personalizedHtml,
                });

                if (sendError) {
                    // Update send record as failed
                    await adminDb.from("lead_campaign_sends")
                        .update({ status: "failed" })
                        .eq("id", sendRecordId);
                    throw new Error(sendError.message);
                }

                // Update send record as sent
                await adminDb.from("lead_campaign_sends")
                    .update({
                        status: "sent",
                        resend_id: sendData?.id || null,
                    })
                    .eq("id", sendRecordId);

                // Update lead status
                await adminDb.from("leads").update({ status: "contacted" }).eq("id", lead.id);

                sentCount++;
            } catch (err: any) {
                failedCount++;
                errors.push(`${lead.email}: ${err.message}`);
            }

            // Throttle between sends
            if (i < eligibleLeads.length - 1) {
                await new Promise(resolve => setTimeout(resolve, SEND_INTERVAL));
            }
        }

        // Update campaign stats
        await adminDb.from("lead_campaigns").update({
            status: "completed",
            sent_count: sentCount,
            failed_count: failedCount,
            total_count: eligibleLeads.length,
            completed_at: new Date().toISOString()
        }).eq("id", campaignId);

        // Audit log
        try {
            await adminDb.from("lead_audit_logs").insert({
                action: "campaign_send",
                entity_type: "campaign",
                details: {
                    campaign_id: campaignId,
                    total: eligibleLeads.length,
                    sent: sentCount,
                    failed: failedCount,
                    skipped: leads.length - eligibleLeads.length
                },
                performed_by: user.id
            });
        } catch { /* audit log optional */ }

        return NextResponse.json({
            success: true,
            campaignId,
            sent: sentCount,
            failed: failedCount,
            skipped: leads.length - eligibleLeads.length,
            errors: errors.length > 0 ? errors.slice(0, 5) : undefined
        });

    } catch (error: any) {
        console.error("Campaign send error:", error);
        return NextResponse.json({ error: error.message || "Beklenmeyen hata" }, { status: 500 });
    }
}
