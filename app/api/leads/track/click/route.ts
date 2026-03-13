import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const sendId = req.nextUrl.searchParams.get("id");
    const targetUrl = req.nextUrl.searchParams.get("url");

    if (!targetUrl) {
        return NextResponse.redirect(new URL("/", req.url));
    }

    // Record click in background - don't block the redirect
    if (sendId) {
        try {
            const adminDb = createAdminClient();

            // Update click tracking
            const now = new Date().toISOString();

            // Set clicked_at if first click, increment click_count
            const { data: send } = await adminDb
                .from("lead_campaign_sends")
                .select("id, campaign_id, click_count, clicked_at")
                .eq("id", sendId)
                .single();

            if (send) {
                const updateData: Record<string, any> = {
                    click_count: (send.click_count || 0) + 1,
                };
                if (!send.clicked_at) {
                    updateData.clicked_at = now;
                }

                await adminDb
                    .from("lead_campaign_sends")
                    .update(updateData)
                    .eq("id", sendId);

                // Update campaign click_count
                if (send.campaign_id) {
                    const { count } = await adminDb
                        .from("lead_campaign_sends")
                        .select("id", { count: "exact", head: true })
                        .eq("campaign_id", send.campaign_id)
                        .not("clicked_at", "is", null);

                    await adminDb
                        .from("lead_campaigns")
                        .update({ click_count: count || 0 })
                        .eq("id", send.campaign_id);
                }
            }
        } catch (err) {
            console.error("Track click error:", err);
        }
    }

    // Redirect to target URL - use 307 to preserve method
    return NextResponse.redirect(new URL(targetUrl), 307);
}
