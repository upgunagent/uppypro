import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 1x1 transparent pixel (GIF)
const PIXEL = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
);

export async function GET(req: NextRequest) {
    const sendId = req.nextUrl.searchParams.get("id");

    if (sendId) {
        try {
            const adminDb = createAdminClient();
            // Update opened_at only if not already opened
            await adminDb
                .from("lead_campaign_sends")
                .update({ opened_at: new Date().toISOString() })
                .eq("id", sendId)
                .is("opened_at", null);

            // Update campaign open_count
            const { data: send } = await adminDb
                .from("lead_campaign_sends")
                .select("campaign_id")
                .eq("id", sendId)
                .single();

            if (send?.campaign_id) {
                const { count } = await adminDb
                    .from("lead_campaign_sends")
                    .select("id", { count: "exact", head: true })
                    .eq("campaign_id", send.campaign_id)
                    .not("opened_at", "is", null);

                await adminDb
                    .from("lead_campaigns")
                    .update({ open_count: count || 0 })
                    .eq("id", send.campaign_id);
            }
        } catch (err) {
            console.error("Track open error:", err);
        }
    }

    // Return 1x1 transparent GIF
    return new NextResponse(PIXEL, {
        status: 200,
        headers: {
            "Content-Type": "image/gif",
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    });
}
